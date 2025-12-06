import { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { EmailConfirmationSuccess } from './components/EmailConfirmationSuccess';
import type { Role, Course, User } from './types';

// Lazy load heavy components to improve initial page load
const TeacherDashboard = lazy(() => 
  import('./components/TeacherDashboard').then(module => ({ default: module.TeacherDashboard }))
);
const StudentDashboard = lazy(() => 
  import('./components/StudentDashboard').then(module => ({ default: module.StudentDashboard }))
);

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
    // Don't fetch courses until user is logged in
    // This improves initial page load performance

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

    // Check session asynchronously without blocking UI
    // Defer to next tick to allow UI to render immediately
    let cancelled = false;
    
    const initializeAuth = async () => {
      // First check URL hash for email confirmation (fast check, no blocking)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const isEmailConfirmation = type === 'signup' || type === 'email' || (accessToken && type);
      
      // Get session (with timeout to prevent hanging)
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (cancelled) return;
        
        // Only wait if we detected email confirmation and have a session
        if (isEmailConfirmation && session?.user) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (cancelled) return;
        
        if (session?.user) {
          // Check if this is an email confirmation redirect
          // Check multiple indicators:
          // 1. URL hash params
          // 2. Email confirmed timestamp (within last minute)
          const emailJustConfirmed = 
            type === 'signup' || 
            type === 'email' ||
            (session.user.email_confirmed_at && 
             new Date(session.user.email_confirmed_at).getTime() > Date.now() - 60000);
          
          if (emailJustConfirmed) {
            setShowEmailConfirmation(true);
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
          
          // Normal session, set user
          const profile = await fetchProfile(session);
          if (cancelled) return;
          
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
      } catch (err) {
        // If session check fails or times out, just show login page (already showing)
        if (!cancelled) {
          console.warn('Session check failed or timed out:', err);
        }
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    // This allows UI to render immediately before checking session
    if ('requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(() => {
        if (!cancelled) initializeAuth();
      }, { timeout: 100 });
      return () => {
        cancelled = true;
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleId);
        }
      };
    } else {
      const timeoutId = setTimeout(() => {
        if (!cancelled) initializeAuth();
      }, 50);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Check if this is a signup/email confirmation event
      if (event === 'SIGNED_IN' && session?.user) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        // Check if email was just confirmed (multiple ways to detect)
        // 1. URL hash params
        // 2. Check if email_confirmed_at is very recent (within last 2 minutes)
        // 3. Check localStorage for pending confirmation
        const emailJustConfirmed = 
          type === 'signup' || 
          type === 'email' ||
          (accessToken && type) ||
          (session.user.email_confirmed_at && 
           new Date(session.user.email_confirmed_at).getTime() > Date.now() - 120000) || // Confirmed within last 2 minutes
          (localStorage.getItem('pending_email_confirmation') === session.user.email);
        
        // If user just confirmed email, show confirmation success page
        if (emailJustConfirmed) {
          // Clear the pending confirmation flag
          localStorage.removeItem('pending_email_confirmation');
          setShowEmailConfirmation(true);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          return; // Don't set currentUser yet, wait for user to click continue
        }
      }
      
      // Also check for TOKEN_REFRESHED event which can happen after email confirmation
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'signup' || type === 'email' || (accessToken && type)) {
          localStorage.removeItem('pending_email_confirmation');
          setShowEmailConfirmation(true);
          window.history.replaceState(null, '', window.location.pathname);
          return;
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

  // Fetch courses only when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchCourses();
    }
  }, [currentUser]);

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
              // Wait a bit for profile to be created by trigger if needed
              await new Promise(resolve => setTimeout(resolve, 300));
              
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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      }>
        <TeacherDashboard
          courses={courses}
          setCourses={setCourses}
          onLogout={handleLogout}
          user={currentUser}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <StudentDashboard
        courses={courses}
        onLogout={handleLogout}
        user={currentUser}
      />
    </Suspense>
  );
}

export default App;
