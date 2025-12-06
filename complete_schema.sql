-- ============================================
-- CED E-LEARNING SYSTEM - COMPLETE SCHEMA
-- ============================================
-- Run this script in Supabase SQL Editor
-- This creates all tables, indexes, functions, triggers, and RLS policies
-- ============================================

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  role text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text])),
  email text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail text,
  instructor_id uuid NOT NULL,
  instructor_name text,
  status text DEFAULT 'published' CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text CHECK (type = ANY (ARRAY['video'::text, 'quiz'::text])),
  video_url text,
  quiz_data jsonb,
  duration integer, -- in seconds
  order_index integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS public.enrollments (
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  completed_at timestamp with time zone,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT enrollments_pkey PRIMARY KEY (user_id, course_id),
  CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Student Progress Table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  completed boolean DEFAULT false,
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT student_progress_pkey PRIMARY KEY (id),
  CONSTRAINT student_progress_unique UNIQUE (user_id, course_id, lesson_id),
  CONSTRAINT student_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT student_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT student_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);

-- Lessons indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON public.lessons(course_id, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_course_order 
ON public.lessons(course_id, order_index) 
WHERE is_deleted = false OR is_deleted IS NULL;

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- Student Progress indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON public.student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id ON public.student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_completed ON public.student_progress(completed);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_course ON public.student_progress(user_id, course_id);

-- ============================================
-- 3. CREATE FUNCTIONS
-- ============================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate course completion percentage
CREATE OR REPLACE FUNCTION public.calculate_course_completion(
  p_user_id uuid,
  p_course_id uuid
) RETURNS integer AS $$
DECLARE
  total_lessons integer;
  completed_lessons integer;
BEGIN
  -- Get total lessons in course
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = p_course_id
  AND (is_deleted = false OR is_deleted IS NULL);
  
  -- Get completed lessons
  SELECT COUNT(DISTINCT lesson_id) INTO completed_lessons
  FROM public.student_progress
  WHERE user_id = p_user_id
  AND course_id = p_course_id
  AND completed = true;
  
  -- Calculate percentage
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_lessons::numeric / total_lessons::numeric) * 100);
END;
$$ LANGUAGE plpgsql;

-- Function to update enrollment completion
CREATE OR REPLACE FUNCTION public.update_enrollment_completion()
RETURNS TRIGGER AS $$
DECLARE
  completion_pct integer;
BEGIN
  completion_pct := public.calculate_course_completion(NEW.user_id, NEW.course_id);
  
  UPDATE public.enrollments
  SET completion_percentage = completion_pct,
      completed_at = CASE WHEN completion_pct = 100 AND status = 'active' THEN NOW() ELSE completed_at END,
      status = CASE WHEN completion_pct = 100 AND status = 'active' THEN 'completed' ELSE status END
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-update enrollment on progress change
DROP TRIGGER IF EXISTS on_progress_update_enrollment ON public.student_progress;
CREATE TRIGGER on_progress_update_enrollment
  AFTER INSERT OR UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enrollment_completion();

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons of own courses" ON public.lessons;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can enroll in courses" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.student_progress;

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses Policies
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (
    status = 'published' 
    AND (is_deleted = false OR is_deleted IS NULL)
  );

CREATE POLICY "Teachers can manage own courses" ON public.courses
  FOR ALL USING (
    auth.uid() = instructor_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Lessons Policies
CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.course_id 
      AND courses.status = 'published'
      AND (courses.is_deleted = false OR courses.is_deleted IS NULL)
    )
    AND (is_deleted = false OR is_deleted IS NULL)
  );

CREATE POLICY "Teachers can manage lessons of own courses" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.course_id 
      AND courses.instructor_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'teacher'
      )
    )
  );

-- Enrollments Policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Student Progress Policies
CREATE POLICY "Users can view own progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.student_progress
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. ADD TABLE COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE public.courses IS 'Course catalog with instructor information';
COMMENT ON TABLE public.lessons IS 'Individual lessons within courses (videos or quizzes)';
COMMENT ON TABLE public.enrollments IS 'Student course enrollments with completion tracking';
COMMENT ON TABLE public.student_progress IS 'Detailed progress tracking per lesson per student';

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.lessons TO authenticated;
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.student_progress TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_course_completion(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_enrollment_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- ============================================
-- COMPLETE!
-- ============================================
-- Schema has been created successfully.
-- All tables, indexes, functions, triggers, and RLS policies are in place.
-- ============================================

