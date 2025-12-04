import React, { useState } from 'react';
import { PlayCircle, CheckCircle, Circle, LogOut, ChevronLeft, Play, BookOpen, ChevronRight } from 'lucide-react';
import type { Course, Lesson, StudentProgress, User } from '../types';

interface StudentDashboardProps {
    courses: Course[];
    onLogout: () => void;
    user: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ courses, onLogout, user }) => {
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [progress, setProgress] = useState<StudentProgress>({});

    const toggleComplete = (courseId: string, lessonId: string) => {
        setProgress(prev => ({
            ...prev,
            [courseId]: {
                ...prev[courseId],
                [lessonId]: !prev[courseId]?.[lessonId]
            }
        }));
    };

    const getEmbedUrl = (url: string) => {
        try {
            let videoId = '';
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v') || '';
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        } catch (e) {
            return '';
        }
    };

    // COURSE PLAYER VIEW
    if (activeCourse && activeLesson) {
        const embedUrl = getEmbedUrl(activeLesson.videoUrl);
        const isCompleted = !!progress[activeCourse.id]?.[activeLesson.id];

        return (
            <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
                <nav className="bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
                    <button
                        onClick={() => setActiveLesson(null)}
                        className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors group"
                    >
                        <div className="p-1 rounded-full group-hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} />
                        </div>
                        Back to Course
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-2" />
                    <h1 className="text-lg font-medium truncate flex-1">{activeLesson.title}</h1>
                </nav>

                <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl ring-1 ring-white/10">
                            {embedUrl ? (
                                <iframe
                                    src={embedUrl}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title={activeLesson.title}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <p>Invalid Video URL</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                            <button
                                onClick={() => toggleComplete(activeCourse.id, activeLesson.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all transform active:scale-95 ${isCompleted
                                    ? 'bg-brand-green text-white shadow-lg shadow-brand-green/30'
                                    : 'bg-white text-slate-900 hover:bg-slate-200'
                                    }`}
                            >
                                {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                                {isCompleted ? 'Completed' : 'Mark as Complete'}
                            </button>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-2 text-slate-200">Description</h3>
                            <p className="text-slate-400 leading-relaxed">{activeLesson.description}</p>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden flex flex-col h-full max-h-[calc(100vh-140px)]">
                            <div className="p-4 border-b border-white/10 bg-white/5">
                                <h3 className="font-bold text-lg">{activeCourse.title}</h3>
                                <p className="text-sm text-slate-400 mt-1">{activeCourse.lessons.length} Lessons</p>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1 flex-1">
                                {activeCourse.lessons.map((lesson, index) => {
                                    const isActive = lesson.id === activeLesson.id;
                                    const isDone = !!progress[activeCourse.id]?.[lesson.id];

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => setActiveLesson(lesson)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isActive
                                                ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                                                : 'hover:bg-white/5 text-slate-300 hover:text-white'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-white/10'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{lesson.title}</p>
                                            </div>
                                            {isDone && <CheckCircle size={16} className="text-brand-green flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // COURSE DETAILS VIEW
    if (activeCourse) {
        const completedLessons = activeCourse.lessons.filter(l => progress[activeCourse.id]?.[l.id]).length;
        const progressPercent = activeCourse.lessons.length > 0
            ? Math.round((completedLessons / activeCourse.lessons.length) * 100)
            : 0;

        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <button
                            onClick={() => setActiveCourse(null)}
                            className="text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors"
                        >
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
                            <img
                                src={activeCourse.thumbnail}
                                alt={activeCourse.title}
                                className="w-full md:w-64 aspect-video md:aspect-[4/3] object-cover rounded-2xl shadow-2xl ring-1 ring-white/20"
                            />
                            <div className="flex-1">
                                <h1 className="text-3xl md:text-4xl font-bold mb-4">{activeCourse.title}</h1>
                                <p className="text-lg text-slate-300 mb-6 leading-relaxed max-w-2xl">{activeCourse.description}</p>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <BookOpen size={20} />
                                        <span>{activeCourse.lessons.length} Lessons</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-orange" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                        <span>{progressPercent}% Complete</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveLesson(activeCourse.lessons[0])}
                                    className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-brand-orange/30 flex items-center gap-2"
                                >
                                    <PlayCircle size={20} />
                                    {progressPercent > 0 ? 'Continue Learning' : 'Start Course'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="max-w-7xl mx-auto px-6 py-12">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Course Curriculum</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {activeCourse.lessons.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No lessons available yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {activeCourse.lessons.map((lesson, index) => {
                                    const isDone = !!progress[activeCourse.id]?.[lesson.id];
                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => setActiveLesson(lesson)}
                                            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-4 group"
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${isDone ? 'bg-brand-green/10 text-brand-green' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-orange/10 group-hover:text-brand-orange'
                                                }`}>
                                                {isDone ? <CheckCircle size={20} /> : index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-slate-900 group-hover:text-brand-orange transition-colors">{lesson.title}</h3>
                                                <p className="text-sm text-slate-500">{lesson.description}</p>
                                            </div>
                                            <div className="p-2 bg-slate-100 rounded-full text-slate-400 group-hover:bg-brand-orange group-hover:text-white transition-all">
                                                <Play size={16} fill="currentColor" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // DASHBOARD HOME VIEW
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <img src="/assets/dept-logo.png" alt="CED Logo" className="h-10 w-auto" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none text-slate-900">CED</span>
                        <span className="text-xs font-bold text-brand-green tracking-wider">E-LEARNING</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-900">{user.name}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block" />
                    <button
                        onClick={onLogout}
                        className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <LogOut size={18} /> <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-dark to-brand-green opacity-90" />
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-orange/20 to-transparent" />

                {/* Watermark */}
                <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-10 pointer-events-none">
                    <img src="/assets/faculty-logo.png" alt="" className="h-96 w-auto" />
                </div>

                <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-white">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-yellow-400">{user.name}</span>
                        </h1>
                        <p className="text-lg text-slate-200 mb-8 leading-relaxed">
                            Continue your journey in Computer Education. Explore our courses designed to enhance your skills.
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 -mt-10 pb-20 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => setActiveCourse(course)}
                            className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-green/10 transition-all duration-300 cursor-pointer"
                        >
                            <div className="aspect-video relative overflow-hidden">
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-brand-green shadow-sm">
                                    {course.lessons.length} Lessons
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-orange transition-colors">
                                    {course.title}
                                </h3>
                                <p className="text-slate-500 line-clamp-2 mb-4 text-sm leading-relaxed">
                                    {course.description}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Course
                                    </span>
                                    <span className="text-brand-green font-medium text-sm group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                        Start Learning <ChevronRight size={16} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {courses.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PlayCircle className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No courses available</h3>
                        <p className="text-slate-500 mt-1">Check back later for new content.</p>
                    </div>
                )}
            </main>
        </div>
    );
};
