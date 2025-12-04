import React, { useState } from 'react';
import { Plus, Video, Trash2, LogOut, Edit, ArrowLeft } from 'lucide-react';
import type { Course, Lesson, User } from '../types';

interface TeacherDashboardProps {
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    onLogout: () => void;
    user: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ courses, setCourses, onLogout, user }) => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

    // New Course State
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCourseThumb, setNewCourseThumb] = useState('');

    // New Lesson State
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonDesc, setNewLessonDesc] = useState('');
    const [newLessonVideo, setNewLessonVideo] = useState('');

    const handleCreateCourse = (e: React.FormEvent) => {
        e.preventDefault();
        const newCourse: Course = {
            id: Date.now().toString(),
            title: newCourseTitle,
            description: newCourseDesc,
            thumbnail: newCourseThumb || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            instructorId: 'current-user', // Mock
            lessons: []
        };
        setCourses([...courses, newCourse]);
        setNewCourseTitle('');
        setNewCourseDesc('');
        setNewCourseThumb('');
        setViewMode('list');
    };

    const handleDeleteCourse = (id: string) => {
        if (confirm('Are you sure you want to delete this course?')) {
            setCourses(courses.filter(c => c.id !== id));
        }
    };

    const handleAddLesson = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourseId) return;

        const newLesson: Lesson = {
            id: Date.now().toString(),
            title: newLessonTitle,
            description: newLessonDesc,
            videoUrl: newLessonVideo,
        };

        setCourses(courses.map(course => {
            if (course.id === editingCourseId) {
                return { ...course, lessons: [...course.lessons, newLesson] };
            }
            return course;
        }));

        setNewLessonTitle('');
        setNewLessonDesc('');
        setNewLessonVideo('');
    };

    const handleDeleteLesson = (courseId: string, lessonId: string) => {
        setCourses(courses.map(course => {
            if (course.id === courseId) {
                return { ...course, lessons: course.lessons.filter(l => l.id !== lessonId) };
            }
            return course;
        }));
    };

    const activeCourse = courses.find(c => c.id === editingCourseId);

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <img src="/assets/dept-logo.png" alt="CED Logo" className="h-10 w-auto" />
                            <div className="flex flex-col">
                                <span className="font-bold text-lg leading-none text-slate-900">CED</span>
                                <span className="text-xs font-bold text-brand-green tracking-wider">INSTRUCTOR</span>
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
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <LogOut size={18} /> <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 lg:p-8">
                {viewMode === 'edit' && activeCourse ? (
                    // COURSE EDITOR VIEW
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <button
                            onClick={() => {
                                setViewMode('list');
                                setEditingCourseId(null);
                            }}
                            className="flex items-center gap-2 text-slate-500 hover:text-brand-orange transition-colors font-medium"
                        >
                            <ArrowLeft size={20} /> Back to Courses
                        </button>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="h-48 w-full relative">
                                <img src={activeCourse.thumbnail} alt={activeCourse.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-6 left-6 text-white">
                                    <h1 className="text-3xl font-bold">{activeCourse.title}</h1>
                                    <p className="opacity-90 mt-1">{activeCourse.description}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Add Lesson Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-brand-green" /> Add New Lesson
                                    </h2>
                                    <form onSubmit={handleAddLesson} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Lesson Title</label>
                                            <input
                                                required
                                                value={newLessonTitle}
                                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                                                placeholder="e.g., Chapter 1: Basics"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                            <textarea
                                                required
                                                value={newLessonDesc}
                                                onChange={(e) => setNewLessonDesc(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none resize-none"
                                                rows={3}
                                                placeholder="Lesson content summary..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">YouTube URL</label>
                                            <input
                                                type="url"
                                                required
                                                value={newLessonVideo}
                                                onChange={(e) => setNewLessonVideo(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                                                placeholder="https://youtube.com/..."
                                            />
                                        </div>
                                        <button type="submit" className="w-full bg-brand-green text-white py-2.5 rounded-xl hover:bg-green-700 font-medium transition-colors">
                                            Add Lesson
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Lesson List */}
                            <div className="lg:col-span-2 space-y-4">
                                <h2 className="text-xl font-bold text-slate-900">Course Content ({activeCourse.lessons.length})</h2>
                                {activeCourse.lessons.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                        <p className="text-slate-500">No lessons yet. Add your first lesson!</p>
                                    </div>
                                ) : (
                                    activeCourse.lessons.map((lesson, index) => (
                                        <div key={lesson.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 items-center group">
                                            <div className="w-8 h-8 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800">{lesson.title}</h3>
                                                <p className="text-sm text-slate-500 line-clamp-1">{lesson.description}</p>
                                            </div>
                                            <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded hidden sm:block">
                                                {lesson.videoUrl}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteLesson(activeCourse.id, lesson.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                ) : viewMode === 'create' ? (
                    // CREATE COURSE VIEW
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={() => setViewMode('list')}
                            className="flex items-center gap-2 text-slate-500 hover:text-brand-orange transition-colors font-medium mb-6"
                        >
                            <ArrowLeft size={20} /> Back to Courses
                        </button>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Plus className="w-6 h-6 text-brand-green" /> Create New Course
                            </h2>
                            <form onSubmit={handleCreateCourse} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Course Title</label>
                                    <input
                                        required
                                        value={newCourseTitle}
                                        onChange={(e) => setNewCourseTitle(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all"
                                        placeholder="e.g., Web Development Bootcamp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        required
                                        value={newCourseDesc}
                                        onChange={(e) => setNewCourseDesc(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none resize-none transition-all"
                                        rows={4}
                                        placeholder="Course overview..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Cover Image URL</label>
                                    <input
                                        type="url"
                                        value={newCourseThumb}
                                        onChange={(e) => setNewCourseThumb(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-brand-green text-white py-3.5 rounded-xl hover:bg-green-700 font-bold text-lg transition-all shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transform hover:-translate-y-0.5">
                                    Create Course
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    // COURSE LIST VIEW
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-900">Your Courses ({courses.length})</h2>
                            <button
                                onClick={() => setViewMode('create')}
                                className="flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-xl hover:bg-green-700 font-medium transition-all shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transform hover:-translate-y-0.5"
                            >
                                <Plus size={20} /> Create New Course
                            </button>
                        </div>

                        {courses.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Plus size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">No courses yet</h3>
                                <p className="text-slate-500 mb-6">Create your first course to get started teaching.</p>
                                <button
                                    onClick={() => setViewMode('create')}
                                    className="text-brand-green font-bold hover:underline"
                                >
                                    Create a Course Now
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map((course) => (
                                    <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-all group">
                                        <div className="h-48 relative overflow-hidden">
                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{course.title}</h3>
                                                <p className="text-slate-500 line-clamp-2 mb-4 text-sm">{course.description}</p>
                                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-50 py-2 px-3 rounded-lg w-fit">
                                                    <span className="flex items-center gap-1.5"><Video size={14} /> {course.lessons.length} Lessons</span>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setEditingCourseId(course.id);
                                                        setViewMode('edit');
                                                    }}
                                                    className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                                                >
                                                    <Edit size={16} /> Manage
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(course.id)}
                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </main >
        </div >
    );
};
