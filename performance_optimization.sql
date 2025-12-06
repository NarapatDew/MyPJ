-- ============================================
-- PERFORMANCE OPTIMIZATION FOR LOGIN
-- ============================================
-- Run this in Supabase SQL Editor to improve login performance
-- This adds indexes and optimizes queries for faster authentication
-- ============================================

-- ============================================
-- 1. CRITICAL INDEXES FOR AUTHENTICATION
-- ============================================

-- Index for profiles.id (primary lookup during login)
-- This is critical because we query profiles by id on every login
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Index for profiles.role (used in RLS policies and queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Composite index for common profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);

-- ============================================
-- 2. OPTIMIZE RLS POLICIES
-- ============================================

-- Drop existing policies that might be slow
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with optimized policies
-- Simple SELECT policy - no complex checks
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT 
  USING (true);

-- Optimized UPDATE policy - direct id comparison
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optimized INSERT policy
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. OPTIMIZE COURSES POLICIES
-- ============================================

-- Drop and recreate courses policies for better performance
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage own courses" ON public.courses;

-- Optimized SELECT policy - use index on status
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT 
  USING (
    status = 'published' 
    AND (is_deleted IS NULL OR is_deleted = false)
  );

-- Optimized teacher policy - check instructor_id first (indexed)
CREATE POLICY "Teachers can manage own courses" ON public.courses
  FOR ALL 
  USING (
    auth.uid() = instructor_id
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'teacher'
      LIMIT 1
    )
  );

-- ============================================
-- 4. OPTIMIZE LESSONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons of own courses" ON public.lessons;

-- Optimized lessons SELECT - use EXISTS with LIMIT for early exit
CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.course_id 
      AND courses.status = 'published'
      AND (courses.is_deleted IS NULL OR courses.is_deleted = false)
      LIMIT 1
    )
    AND (is_deleted IS NULL OR is_deleted = false)
  );

-- Optimized teacher lessons policy
CREATE POLICY "Teachers can manage lessons of own courses" ON public.lessons
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.course_id 
      AND courses.instructor_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================
-- 5. ADD INDEXES FOR FOREIGN KEYS
-- ============================================

-- These indexes help with JOINs and foreign key lookups
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON public.student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id ON public.student_progress(lesson_id);

-- ============================================
-- 6. OPTIMIZE PROFILE QUERIES
-- ============================================

-- Add covering index for common profile queries
-- This allows the query to be satisfied entirely from the index
CREATE INDEX IF NOT EXISTS idx_profiles_covering 
ON public.profiles(id, role, full_name, avatar_url, email);

-- ============================================
-- 7. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update table statistics for better query planning
ANALYZE public.profiles;
ANALYZE public.courses;
ANALYZE public.lessons;
ANALYZE public.enrollments;
ANALYZE public.student_progress;

-- ============================================
-- 8. OPTIMIZE AUTH STATE CHANGE HANDLING
-- ============================================

-- Create a function to quickly get user profile (cached approach)
CREATE OR REPLACE FUNCTION public.get_user_profile_fast(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  role text,
  email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.role,
    p.email
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_profile_fast(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_fast(uuid) TO anon;

-- ============================================
-- 9. ADD PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================

-- Index for active enrollments only
CREATE INDEX IF NOT EXISTS idx_enrollments_active 
ON public.enrollments(user_id, course_id) 
WHERE status = 'active';

-- Index for published courses only
CREATE INDEX IF NOT EXISTS idx_courses_published 
ON public.courses(id, instructor_id, title, description, thumbnail) 
WHERE status = 'published' AND (is_deleted IS NULL OR is_deleted = false);

-- Index for non-deleted lessons
CREATE INDEX IF NOT EXISTS idx_lessons_active 
ON public.lessons(course_id, order_index, id) 
WHERE is_deleted IS NULL OR is_deleted = false;

-- ============================================
-- 10. OPTIMIZE TRIGGERS
-- ============================================

-- Make sure the handle_new_user function is optimized
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

-- ============================================
-- 11. ADD CONNECTION POOLING HINTS
-- ============================================

-- Set work_mem for better query performance (if you have access)
-- Note: This might require superuser privileges
-- ALTER SYSTEM SET work_mem = '16MB';
-- SELECT pg_reload_conf();

-- ============================================
-- 12. CREATE MATERIALIZED VIEW FOR FAST LOOKUPS
-- ============================================

-- Optional: Create a materialized view for user profiles (refresh periodically)
-- This can speed up reads but needs to be refreshed
-- Uncomment if you want to use this approach:

/*
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_profiles_cache AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.role,
  p.email,
  u.email as auth_email,
  u.user_metadata
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

CREATE UNIQUE INDEX ON public.user_profiles_cache(id);
CREATE INDEX ON public.user_profiles_cache(role);

-- Refresh function (call this periodically or after profile updates)
CREATE OR REPLACE FUNCTION public.refresh_user_profiles_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_profiles_cache;
END;
$$ LANGUAGE plpgsql;
*/

-- ============================================
-- 13. VERIFY INDEXES
-- ============================================

-- Check all indexes on profiles table
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY indexname;

-- ============================================
-- COMPLETE!
-- ============================================
-- Performance optimizations applied:
-- 1. Critical indexes for authentication queries
-- 2. Optimized RLS policies
-- 3. Covering indexes for common queries
-- 4. Partial indexes for filtered queries
-- 5. Fast profile lookup function
-- 6. Updated table statistics
-- 
-- Login should now be significantly faster!
-- ============================================

