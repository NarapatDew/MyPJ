import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { EmailConfirmationSuccess } from './components/EmailConfirmationSuccess';
import type { Role, Course, User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  /* eslint-disable react-hooks/exhaustive-deps */
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lessons (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      if (data) {
        const mappedCourses: Course[] = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail,
          instructorId: c.instructor_id,
          instructorName: c.instructor_name,
          lessons: (c.lessons || []).map((l: any) => ({
            id: l.id,
            title: l.title,
            description: l.description,
            type: l.type,
            videoUrl: l.video_url,
            quizData: l.quiz_data,
            duration: l.duration
          })).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        }));
        setCourses(mappedCourses);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchCourses();

    // Check for email confirmation in URL hash
    const checkEmailConfirmation = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // Check if this is an email confirmation redirect
      if (type === 'signup' || type === 'email' || (accessToken && type)) {
        // Wait a bit for Supabase to process the token
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if we have a session now
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setShowEmailConfirmation(true);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    checkEmailConfirmation();

    const fetchProfile = async (session: any) => {
      if (!session?.user) return null;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.warn('Error fetching profile, using session data:', error);
          return null;
        }
        return profile;
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        return null;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check if this is an email confirmation redirect
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type === 'signup' || type === 'email') {
          // This is an email confirmation, show success page
          setShowEmailConfirmation(true);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        
        // Normal session, set user
        const profile = await fetchProfile(session);
        // Fallback to metadata if profile fetch fails (e.g. initial load race condition), otherwise use profile role
        const role = profile?.role || (session.user.user_metadata?.role as Role) || 'student';
        const name = profile?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        setCurrentUser({
          id: session.user.id,
          name,
          email: session.user.email || '',
          role,
          avatar: profile?.avatar_url
        });
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Check if this is a signup/email confirmation event
      if (event === 'SIGNED_IN' && session?.user) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        // If user just confirmed email, show confirmation success page
        if (type === 'signup' || type === 'email') {
          setShowEmailConfirmation(true);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          return; // Don't set currentUser yet, wait for user to click continue
        }
      }

      if (session?.user && !showEmailConfirmation) {
        try {
          const profile = await fetchProfile(session);
          const role = profile?.role || (session.user.user_metadata?.role as Role) || 'student';
          const name = profile?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

          setCurrentUser({
            id: session.user.id,
            name,
            email: session.user.email || '',
            role,
            avatar: profile?.avatar_url
          });
        } catch (err) {
          console.error('Error in onAuthStateChange:', err);
          // Set user with metadata only if profile fetch fails
          const role = (session.user.user_metadata?.role as Role) || 'student';
          const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
          setCurrentUser({
            id: session.user.id,
            name,
            email: session.user.email || '',
            role,
            avatar: undefined
          });
        }
      } else {
        setCurrentUser(null);
        setAuthMode('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (_email: string, _role: Role, session?: any) => {
    // onAuthStateChange will automatically handle setting the user
    // But we'll set it immediately as a fallback in case onAuthStateChange is delayed
    if (session?.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const role = profile?.role || (session.user.user_metadata?.role as Role) || 'student';
        const name = profile?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        setCurrentUser({
          id: session.user.id,
          name,
          email: session.user.email || '',
          role,
          avatar: profile?.avatar_url
        });
      } catch (error) {
        console.error('Error fetching profile in handleLogin:', error);
        // Still set user with metadata if profile fetch fails
        const role = (session.user.user_metadata?.role as Role) || 'student';
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
        setCurrentUser({
          id: session.user.id,
          name,
          email: session.user.email || '',
          role,
          avatar: undefined
        });
      }
    }
  };



  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    } finally {
      // Always clear local state, even if the server request fails (e.g. 403)
      setCurrentUser(null);
      setAuthMode('login');
    }
  };

  // Show email confirmation success page if user just confirmed email
  if (showEmailConfirmation) {
    return (
      <EmailConfirmationSuccess
        onContinue={async () => {
          setShowEmailConfirmation(false);
          // Get the current session and set user
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              const role = profile?.role || (session.user.user_metadata?.role as Role) || 'student';
              const name = profile?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

              setCurrentUser({
                id: session.user.id,
                name,
                email: session.user.email || '',
                role,
                avatar: profile?.avatar_url
              });
            } catch (error) {
              console.error('Error fetching profile:', error);
              // Fallback to metadata
              const role = (session.user.user_metadata?.role as Role) || 'student';
              const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
              setCurrentUser({
                id: session.user.id,
                name,
                email: session.user.email || '',
                role,
                avatar: undefined
              });
            }
          } else {
            // No session, go to login
            setAuthMode('login');
          }
        }}
      />
    );
  }

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
