import React, { useState } from 'react';
import { PlayCircle, CheckCircle, Circle, LogOut, ChevronLeft, Play, BookOpen, Settings, Mail, Shield, X, Eye, Menu, Compass, User as UserIcon } from 'lucide-react';
import type { Course, Lesson, StudentProgress, User } from '../types';
import { supabase } from '../lib/supabase';

interface StudentDashboardProps {
    courses: Course[];
    onLogout: () => void;
    user: User;
    onExitPreview?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ courses, onLogout, user, onExitPreview }) => {
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [progress, setProgress] = useState<StudentProgress>({});
    const [viewMode, setViewMode] = useState<'learning' | 'explore' | 'settings'>('explore');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [studentName, setStudentName] = useState(user.name || user.email?.split('@')[0] || 'Student');

    // Enrollment State
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
    const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(true);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Reset quiz state when changing lessons
    React.useEffect(() => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(0);
    }, [activeLesson]);

    // Fetch initial progress and enrollments
    React.useEffect(() => {
        const fetchUserData = async () => {
            if (!user.id) return;
            setIsLoadingEnrollments(true);

            // 1. Fetch Progress
            const { data: progressData, error: progressError } = await supabase
                .from('student_progress')
                .select('*')
                .eq('user_id', user.id);

            if (!progressError && progressData) {
                const newProgress: StudentProgress = {};
                progressData.forEach((row: any) => {
                    if (!newProgress[row.course_id]) {
                        newProgress[row.course_id] = {};
                    }
                    newProgress[row.course_id][row.lesson_id] = row.score > 0 ? row.score : row.completed;
                });
                setProgress(newProgress);
            }

            // 2. Fetch Enrollments
            const { data: enrollData, error: enrollError } = await supabase
                .from('enrollments')
                .select('course_id')
                .eq('user_id', user.id);

            if (!enrollError && enrollData) {
                setEnrolledCourseIds(new Set(enrollData.map(e => e.course_id)));
                // If user has enrollments, default to 'learning', otherwise 'explore'
                if (enrollData.length > 0) {
                    setViewMode('learning');
                }
            }

            setIsLoadingEnrollments(false);
        };

        fetchUserData();
    }, [user.id]);

    const handleEnroll = async (courseId: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .insert({
                    user_id: user.id,
                    course_id: courseId
                });

            if (error) throw error;

            setEnrolledCourseIds(prev => new Set(prev).add(courseId));
            setViewMode('learning');
        } catch (error: any) {
            console.error('Error enrolling:', error);
            alert(`Failed to enroll: ${error.message || 'Unknown error'}. \n\nDid you run the 'enrollment_setup.sql' script in Supabase?`);
        }
    };

    const saveProgressToDB = async (courseId: string, lessonId: string, completed: boolean, score: number = 0) => {
        try {
            const { data: existing } = await supabase
                .from('student_progress')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .eq('lesson_id', lessonId)
                .single();

            if (existing) {
                await supabase
                    .from('student_progress')
                    .update({ completed, score, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('student_progress')
                    .insert({
                        user_id: user.id,
                        course_id: courseId,
                        lesson_id: lessonId,
                        completed,
                        score
                    });
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    };

    const toggleComplete = (courseId: string, lessonId: string) => {
        const currentCourseProgress = progress[courseId] || {};
        const isCompleted = !!currentCourseProgress[lessonId];
        const newStatus = !isCompleted;

        setProgress(prev => ({
            ...prev,
            [courseId]: {
                ...prev[courseId],
                [lessonId]: newStatus
            }
        }));

        saveProgressToDB(courseId, lessonId, newStatus, 0);
    };

    // ... (rest of quiz logic stays same, ensuring imports used) ...
    const handleAnswerSelect = (questionId: string, optionIndex: number) => {
        setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleQuizSubmit = (courseId: string, lesson: Lesson) => {
        if (!lesson.quizData) return;
        let correctCount = 0;
        lesson.quizData.questions.forEach(q => {
            if (quizAnswers[q.id] === q.correctOptionIndex) correctCount++;
        });
        const score = Math.round((correctCount / lesson.quizData.questions.length) * 100);
        setQuizScore(score);
        setQuizSubmitted(true);

        setProgress(prev => ({
            ...prev,
            [courseId]: { ...prev[courseId], [lesson.id]: score }
        }));
        saveProgressToDB(courseId, lesson.id, true, score);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: "Passwords do not match", type: 'error' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ text: "Password must be at least 6 characters", type: 'error' });
            return;
        }
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ text: "Password updated successfully!", type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false);
        } catch (error: any) {
            setPasswordMessage({ text: error.message, type: 'error' });
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: studentName })
                .eq('id', user.id);

            if (error) throw error;
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        }
    };

    const getEmbedUrl = (url: string) => {
        try {
            let videoId = '';
            if (url.includes('youtube.com/watch')) videoId = new URL(url).searchParams.get('v') || '';
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        } catch (e) { return ''; }
    };

    // Views
    const enrolledCourses = courses.filter(c => enrolledCourseIds.has(c.id));
    const availableCourses = courses.filter(c => !enrolledCourseIds.has(c.id));

    // COURSE PLAYER VIEW
    if (activeCourse && activeLesson) {
        // Security check: Must be enrolled
        if (!enrolledCourseIds.has(activeCourse.id)) {
            setActiveCourse(null);
            setActiveLesson(null);
            return null;
        }
        const embedUrl = activeLesson.videoUrl ? getEmbedUrl(activeLesson.videoUrl) : '';
        const isCompleted = !!progress[activeCourse.id]?.[activeLesson.id];

        // ... (Return existing Player JSX but I need to include it in replacement or it gets cut)
        return (
            <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
                <nav className="bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
                    <button onClick={() => setActiveLesson(null)} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors group">
                        <div className="p-1 rounded-full group-hover:bg-white/10 transition-colors"><ChevronLeft size={20} /></div>
                        Back to Course
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-2" />
                    <h1 className="text-lg font-medium truncate flex-1">{activeLesson.title}</h1>
                </nav>
                <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {activeLesson.type === 'video' ? (
                            <>
                                <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl ring-1 ring-white/10">
                                    {embedUrl ? <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={activeLesson.title} /> : <div className="w-full h-full flex items-center justify-center text-slate-500"><p>Invalid Video URL</p></div>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                                    <button onClick={() => toggleComplete(activeCourse.id, activeLesson.id)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all transform active:scale-95 ${isCompleted ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30' : 'bg-white text-slate-900 hover:bg-slate-200'}`}>
                                        {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                                        {isCompleted ? 'Completed' : 'Mark as Complete'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white/5 rounded-2xl border border-white/10 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                                    {quizSubmitted && <div className={`px-4 py-2 rounded-lg font-bold ${quizScore >= 70 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>Score: {quizScore}%</div>}
                                </div>
                                {activeLesson.quizData && (
                                    <div className="space-y-8">
                                        {activeLesson.quizData.questions.map((q, idx) => (
                                            <div key={q.id} className="space-y-4">
                                                <h3 className="text-lg font-medium text-slate-200">{idx + 1}. {q.text}</h3>
                                                <div className="space-y-2">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = quizAnswers[q.id] === optIdx;
                                                        const isCorrect = q.correctOptionIndex === optIdx;
                                                        let optionClass = "w-full p-4 rounded-xl text-left transition-all border border-white/10 hover:bg-white/5";
                                                        if (quizSubmitted) {
                                                            if (isCorrect) optionClass = "w-full p-4 rounded-xl text-left bg-green-500/20 border-green-500/50 text-green-200";
                                                            else if (isSelected && !isCorrect) optionClass = "w-full p-4 rounded-xl text-left bg-red-500/20 border-red-500/50 text-red-200";
                                                        } else if (isSelected) optionClass = "w-full p-4 rounded-xl text-left bg-brand-orange text-white shadow-lg shadow-brand-orange/20 border-transparent";
                                                        return <button key={optIdx} onClick={() => !quizSubmitted && handleAnswerSelect(q.id, optIdx)} disabled={quizSubmitted} className={optionClass}>{opt}</button>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {!quizSubmitted ? (
                                            <button onClick={() => handleQuizSubmit(activeCourse.id, activeLesson)} disabled={Object.keys(quizAnswers).length !== activeLesson.quizData.questions.length} className="w-full py-4 bg-brand-green text-white rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Submit Quiz</button>
                                        ) : (
                                            <div className="p-4 bg-white/5 rounded-xl text-center"><p className="text-slate-300">Quiz completed! You scored {quizScore}%.</p></div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-2 text-slate-200">Description</h3>
                            <p className="text-slate-400 leading-relaxed">{activeLesson.description}</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // COURSE DETAILS VIEW
    if (activeCourse) {
        const completedLessons = activeCourse.lessons.filter(l => progress[activeCourse.id]?.[l.id]).length;
        const progressPercent = activeCourse.lessons.length > 0 ? Math.round((completedLessons / activeCourse.lessons.length) * 100) : 0;
        const isEnrolled = enrolledCourseIds.has(activeCourse.id);

        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <button onClick={() => setActiveCourse(null)} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors">
                            <ChevronLeft size={20} /> Back to Dashboard
                        </button>
                    </div>
                </nav>
                <div className="bg-slate-900 text-white py-12 lg:py-20 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <img src={activeCourse.thumbnail} className="w-full h-full object-cover opacity-20 blur-sm" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
                        <div className="absolute inset-0 bg-brand-green/20 mix-blend-overlay" />
                    </div>
                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <img src={activeCourse.thumbnail} alt={activeCourse.title} className="w-full md:w-64 aspect-video md:aspect-[4/3] object-cover rounded-2xl shadow-2xl ring-1 ring-white/20" />
                            <div className="flex-1">
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">{activeCourse.title}</h1>
                                {activeCourse.instructorName && <p className="text-lg font-medium text-brand-green mb-4">Instructor: {activeCourse.instructorName}</p>}
                                <p className="text-lg text-slate-300 mb-6 leading-relaxed max-w-2xl">{activeCourse.description}</p>

                                {isEnrolled ? (
                                    <>
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="flex items-center gap-2 text-slate-300"><BookOpen size={20} /><span>{activeCourse.lessons.length} Lessons</span></div>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-brand-orange" style={{ width: `${progressPercent}%` }} /></div>
                                                <span>{progressPercent}% Complete</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveLesson(activeCourse.lessons[0])} className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-brand-orange/30 flex items-center gap-2">
                                            <PlayCircle size={20} /> {progressPercent > 0 ? 'Continue Learning' : 'Start Course'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleEnroll(activeCourse.id)} className="bg-brand-green text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-brand-green/30 flex items-center gap-2">
                                            Enroll Now
                                        </button>
                                        <p className="text-slate-400 text-sm">Enroll to access course content</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Curriculum only visible if enrolled? Or visible but disabled? Design choice: Visible but disabled/locked? Let's hide content or show locked icon for now to be safe, or just show list but not clickable */}
                <main className="max-w-7xl mx-auto px-6 py-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Course Curriculum</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {activeCourse.lessons.map((lesson, index) => {
                            const isDone = !!progress[activeCourse.id]?.[lesson.id];
                            return (
                                <div key={lesson.id} onClick={() => isEnrolled && setActiveLesson(lesson)} className={`p-4 transition-colors flex items-center gap-4 group ${isEnrolled ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${isDone ? 'bg-brand-green/10 text-brand-green' : 'bg-slate-100 text-slate-500'}`}>
                                        {isDone ? <CheckCircle size={20} /> : index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                                        <p className="text-sm text-slate-500">{lesson.description}</p>
                                    </div>
                                    {isEnrolled && <div className="p-2 bg-slate-100 rounded-full text-slate-400 group-hover:bg-brand-orange group-hover:text-white transition-all"><Play size={16} fill="currentColor" /></div>}
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
        );
    }

    // DASHBOARD HOME VIEW
    return (
        <div className="min-h-screen bg-slate-50 font-sans flex">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange/20 rounded-xl flex items-center justify-center">
                            <Shield className="text-brand-orange" size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">CED</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wider">STUDENT</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <button
                        onClick={() => { setViewMode('learning'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'learning' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><BookOpen size={20} /></div>
                        <span className="font-medium">My Learning</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('explore'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'explore' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Compass size={20} /></div>
                        <span className="font-medium">Explore Courses</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('settings'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'settings' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Settings size={20} /></div>
                        <span className="font-medium">Settings</span>
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <div className="w-5 h-5"><LogOut size={20} /></div>
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">
                            {viewMode === 'learning' ? 'My Learning' : viewMode === 'explore' ? 'Explore Courses' : 'Settings'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {onExitPreview && (
                            <button
                                onClick={onExitPreview}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-xl font-bold hover:bg-brand-orange/20 transition-colors border border-brand-orange/20"
                            >
                                <Eye size={18} />
                                <span className="hidden sm:inline">Exit Preview</span>
                            </button>
                        )}
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-900">{user.email?.split('@')[0]}</p>
                                <p className="text-xs text-slate-500">Student</p>
                            </div>
                            <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-white">
                                {user.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8">
                    {/* MY LEARNING VIEW */}
                    {viewMode === 'learning' && (
                        <div className="max-w-7xl mx-auto space-y-8">
                            {isLoadingEnrollments ? (
                                <div className="text-center py-20 text-slate-500">Loading your courses...</div>
                            ) : enrolledCourses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpen size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No courses yet</h3>
                                    <p className="text-slate-500 mb-6">Start your learning journey by exploring our available courses.</p>
                                    <button
                                        onClick={() => setViewMode('explore')}
                                        className="bg-brand-orange text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
                                    >
                                        <Compass size={20} /> Browse Courses
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {enrolledCourses.map(course => {
                                        const completedLessons = course.lessons.filter(l => progress[course.id]?.[l.id]).length;
                                        const progressPercent = course.lessons.length > 0
                                            ? Math.round((completedLessons / course.lessons.length) * 100)
                                            : 0;

                                        return (
                                            <div
                                                key={course.id}
                                                onClick={() => setActiveCourse(course)}
                                                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
                                            >
                                                <div className="relative aspect-video overflow-hidden">
                                                    <img
                                                        src={course.thumbnail}
                                                        alt={course.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                                                            <div className="h-full bg-brand-orange" style={{ width: `${progressPercent}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-6 flex-1 flex flex-col">
                                                    <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-brand-orange transition-colors">
                                                        {course.title}
                                                    </h3>
                                                    {course.instructorName && (
                                                        <p className="text-sm font-medium text-slate-500 mb-4">{course.instructorName}</p>
                                                    )}
                                                    <div className="mt-auto flex items-center justify-between text-sm text-slate-500">
                                                        <span className="flex items-center gap-2">
                                                            <BookOpen size={16} />
                                                            {course.lessons.length} Lessons
                                                        </span>
                                                        <span className="font-medium text-brand-green">
                                                            {progressPercent}% Complete
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* EXPLORE COURSES VIEW */}
                    {viewMode === 'explore' && (
                        <div className="max-w-7xl mx-auto space-y-8">
                            {isLoadingEnrollments ? (
                                <div className="text-center py-20 text-slate-500">Loading courses...</div>
                            ) : availableCourses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No new courses available</h3>
                                    <p className="text-slate-500 mb-6">You have enrolled in all available courses!</p>
                                    <button
                                        onClick={() => setViewMode('learning')}
                                        className="bg-brand-orange text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                                    >
                                        Go to My Learning
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {availableCourses.map(course => (
                                        <div
                                            key={course.id}
                                            onClick={() => setActiveCourse(course)}
                                            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
                                        >
                                            <div className="relative aspect-video overflow-hidden">
                                                <img
                                                    src={course.thumbnail}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <span className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                        View Details
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-brand-orange transition-colors">
                                                    {course.title}
                                                </h3>
                                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{course.description}</p>
                                                {course.instructorName && (
                                                    <p className="text-xs font-bold text-brand-green uppercase tracking-wider mb-4">
                                                        By {course.instructorName}
                                                    </p>
                                                )}
                                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="flex items-center gap-2 text-slate-500 text-sm">
                                                        <BookOpen size={16} />
                                                        {course.lessons.length} Lessons
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEnroll(course.id);
                                                        }}
                                                        className="text-brand-orange font-bold text-sm hover:underline"
                                                    >
                                                        Enroll Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS VIEW */}
                    {viewMode === 'settings' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h2>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-brand-orange text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-white">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{studentName}</h3>
                                            <p className="text-slate-500">Student Account</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    <form onSubmit={handleUpdateProfile}>
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                                            <UserIcon className="text-slate-400" size={18} />
                                            Personal Information
                                        </h4>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={studentName}
                                                onChange={(e) => setStudentName(e.target.value)}
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                                                placeholder="Your Full Name"
                                            />
                                            <button
                                                type="submit"
                                                className="px-6 py-3 bg-brand-green text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-brand-green/20"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </form>

                                    <div>
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                                            <Mail size={18} className="text-slate-400" />
                                            Email Address
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-600 font-medium">
                                            {user.email}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                                            <Shield size={18} className="text-slate-400" />
                                            Security
                                        </h4>

                                        {!isChangingPassword ? (
                                            <button
                                                onClick={() => setIsChangingPassword(true)}
                                                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-brand-orange hover:text-brand-orange transition-colors"
                                            >
                                                Change Password
                                            </button>
                                        ) : (
                                            <form onSubmit={handleChangePassword} className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-bold text-slate-900">New Password</h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsChangingPassword(false); setPasswordMessage(null); }}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                                                        placeholder="Min. 6 characters"
                                                        minLength={6}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                                                        placeholder="Re-enter new password"
                                                        minLength={6}
                                                        required
                                                    />
                                                </div>

                                                {passwordMessage && (
                                                    <div className={`text-sm p-3 rounded-lg font-medium ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {passwordMessage.text}
                                                    </div>
                                                )}

                                                <button
                                                    type="submit"
                                                    className="w-full py-3 bg-brand-orange text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-brand-orange/20"
                                                >
                                                    Update Password
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
