import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import type { Role, Course, User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'Frontend Development Mastery',
      description: 'Become a professional frontend developer by mastering React, Tailwind CSS, and modern web practices.',
      thumbnail: '/assets/course-frontend.png',
      instructorId: 'teacher-1',
      lessons: [
        {
          id: '101',
          title: 'Introduction to React 19',
          description: 'Learn the basics of React, including components, props, state, and the new features in React 19.',
          videoUrl: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM'
        },
        {
          id: '102',
          title: 'Mastering Tailwind CSS',
          description: 'A comprehensive guide to styling your apps with Tailwind CSS utility classes.',
          videoUrl: 'https://www.youtube.com/watch?v=dFgzHOX84xQ'
        }
      ]
    },
    {
      id: '2',
      title: 'UI/UX Design Fundamentals',
      description: 'Learn how to design beautiful user interfaces and create engaging user experiences.',
      thumbnail: '/assets/course-uiux.png',
      instructorId: 'teacher-1',
      lessons: [
        {
          id: '201',
          title: 'Design Principles',
          description: 'Understand color theory, typography, and layout.',
          videoUrl: 'https://www.youtube.com/watch?v=c9Wg6Cb_YlU'
        }
      ]
    }
  ]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role as Role || 'student';
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        setCurrentUser({
          id: session.user.id,
          name,
          email: session.user.email || '',
          role,
        });
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role as Role || 'student';
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        setCurrentUser({
          id: session.user.id,
          name,
          email: session.user.email || '',
          role,
        });
      } else {
        setCurrentUser(null);
        setAuthMode('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (_email: string, _role: Role) => {
    // This is now handled by the auth state listener, but we keep the prop for the LoginScreen
    // In a real refactor we might remove this prop entirely, but for now it's fine.
  };

  const handleRegister = (_name: string, _email: string, _role: Role) => {
    // Also handled by auth listener
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!currentUser) {
    if (authMode === 'login') {
      return (
        <LoginScreen
          onLogin={handleLogin}
          onSwitchToRegister={() => setAuthMode('register')}
        />
      );
    } else {
      return (
        <RegisterScreen
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    }
  }

  if (currentUser.role === 'teacher') {
    return (
      <TeacherDashboard
        courses={courses}
        setCourses={setCourses}
        onLogout={handleLogout}
        user={currentUser}
      />
    );
  }

  return (
    <StudentDashboard
      courses={courses}
      onLogout={handleLogout}
      user={currentUser}
    />
  );
}

export default App;
