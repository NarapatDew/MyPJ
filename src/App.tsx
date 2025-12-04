import { useState } from 'react';
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
      thumbnail: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
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
      thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
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

  const handleLogin = (email: string, role: Role) => {
    setCurrentUser({
      id: Date.now().toString(),
      name: email.split('@')[0],
      email,
      role,
    });
  };

  const handleRegister = (name: string, email: string, role: Role) => {
    setCurrentUser({
      id: Date.now().toString(),
      name,
      email,
      role,
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthMode('login');
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
      />
    );
  }

  return (
    <StudentDashboard
      courses={courses}
      onLogout={handleLogout}
    />
  );
}

export default App;
