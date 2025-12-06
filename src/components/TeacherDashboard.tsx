import React, { useState } from 'react';
import { Plus, Video, Trash2, LogOut, Edit, ArrowLeft, Settings, User as UserIcon, Mail, Shield, Eye, Menu, X, Upload, Loader2, Users, TrendingUp, Award } from 'lucide-react';
import type { Course, Lesson, User } from '../types';
import { StudentDashboard } from './StudentDashboard';
import { supabase } from '../lib/supabase';

// Student Data Interface
interface StudentData {
    id: string;
    name: string;
    email: string; // Note: Profiles might not have email if not in metadata, but we'll try to get it or use placeholder
    avatar: string | null;
    coursesEnrolled: number;
    progress: number;
    quizAvg: number;
    status: 'Active' | 'Inactive' | 'Warning';
}

interface TeacherDashboardProps {
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    onLogout: () => void;
    user: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ courses, setCourses, onLogout, user }) => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'settings' | 'student-preview' | 'students'>('list');
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false); // For course details edit mode

    // Students Data State
    const [students, setStudents] = useState<StudentData[]>([]);

    // Fetch Students Data
    React.useEffect(() => {
        if (viewMode === 'students') {
            const fetchStudentData = async () => {
                // 1. Fetch Profiles
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'student');

                if (profilesError) {
                    console.error('Error fetching profiles:', profilesError);
                    return;
                }

                // 2. Fetch All Progress
                const { data: progressData, error: progressError } = await supabase
                    .from('student_progress')
                    .select('*');

                if (progressError) {
                    console.error('Error fetching progress:', progressError);
                    return;
                }

                // 3. Process Data
                const processedStudents: StudentData[] = (profiles || []).map(profile => {
                    const studentProgress = progressData?.filter((p: any) => p.user_id === profile.id) || [];

                    // Courses Enrolled (unique course_ids)
                    const uniqueCourses = new Set(studentProgress.map((p: any) => p.course_id));
                    const coursesEnrolled = uniqueCourses.size;

                    // Calculate Progress Avg (This is rough, ideally per course)
                    // For now: (Completed Record Count / (Enrolled Courses * Avg Lessons per course)) * 100?
                    // Let's simpler: sum of scores / records? No.
                    // Let's do: (Completed Items / Total Possible Items in Enrolled Courses) * 100
                    // But we don't know total items easily here without complex join.
                    // Fallback: Just Average of "completed" flags if we treat them as 100?

                    // Better metric: Quiz Average
                    const quizzes = studentProgress.filter((p: any) => p.score > 0);
                    const quizAvg = quizzes.length > 0
                        ? Math.round(quizzes.reduce((acc: number, curr: any) => acc + curr.score, 0) / quizzes.length)
                        : 0;

                    // Progress %: Simply % of lessons completed out of TOTAL lessons in ALL courses?
                    // We have `courses` prop.
                    let totalLessons = 0;
                    let completedLessons = 0;

                    courses.forEach(c => {
                        if (uniqueCourses.has(c.id)) {
                            totalLessons += c.lessons.length;
                            // Count completed for this course
                            completedLessons += studentProgress.filter((p: any) => p.course_id === c.id && p.completed).length;
                        }
                    });

                    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                    // Status Logic
                    let status: 'Active' | 'Inactive' | 'Warning' = 'Inactive';
                    if (progress > 0) status = 'Active';
                    if (progress > 0 && progress < 20 && coursesEnrolled > 0) status = 'Warning';
                    if (progress === 0 && coursesEnrolled > 0) status = 'Inactive';
                    if (coursesEnrolled === 0) status = 'Inactive'; // or New

                    return {
                        id: profile.id,
                        name: profile.full_name || 'Unknown Student',
                        email: profile.email || 'No Email',
                        avatar: profile.avatar_url,
                        coursesEnrolled,
                        progress,
                        quizAvg,
                        status
                    };
                });

                setStudents(processedStudents);
            };

            fetchStudentData();
        }
    }, [viewMode, courses]);

    // New Course State
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCourseThumb, setNewCourseThumb] = useState('');

    // New Lesson State
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonDesc, setNewLessonDesc] = useState('');
    const [newLessonVideo, setNewLessonVideo] = useState('');
    const [newLessonType, setNewLessonType] = useState<'video' | 'quiz'>('video');
    const [newQuizQuestions, setNewQuizQuestions] = useState<{ text: string; options: string[]; correct: number }[]>([]);
    const [currentQuestionText, setCurrentQuestionText] = useState('');
    const [currentOptions, setCurrentOptions] = useState(['', '', '', '']);
    const [currentCorrectOption, setCurrentCorrectOption] = useState(0);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Image Upload State
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `course-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-thumbnails')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-thumbnails')
                .getPublicUrl(filePath);

            setNewCourseThumb(publicUrl);
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Error uploading image: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { data, error } = await supabase
                .from('courses')
                .insert({
                    title: newCourseTitle,
                    description: newCourseDesc,
                    thumbnail: newCourseThumb || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    instructor_id: user.id,
                    instructor_name: user.name
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newCourse: Course = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    thumbnail: data.thumbnail,
                    instructorId: data.instructor_id,
                    instructorName: data.instructor_name,
                    lessons: []
                };
                setCourses([...courses, newCourse]);
                setNewCourseTitle('');
                setNewCourseDesc('');
                setNewCourseThumb('');
                setViewMode('list');
            }
        } catch (error) {
            console.error('Error creating course:', error);
            alert('Failed to create course. Please try again.');
        }
    };

    const handleUpdateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourseId) return;

        try {
            const { error } = await supabase
                .from('courses')
                .update({
                    title: newCourseTitle,
                    description: newCourseDesc,
                    thumbnail: newCourseThumb
                })
                .eq('id', editingCourseId);

            if (error) throw error;

            setCourses(courses.map(c => c.id === editingCourseId ? {
                ...c,
                title: newCourseTitle,
                description: newCourseDesc,
                thumbnail: newCourseThumb
            } : c));

            alert('Course updated successfully!');
            setIsEditingDetails(false);
        } catch (error) {
            console.error('Error updating course:', error);
            alert('Failed to update course.');
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (confirm('Are you sure you want to delete this course?')) {
            try {
                const { error } = await supabase
                    .from('courses')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                setCourses(courses.filter(c => c.id !== id));
            } catch (error) {
                console.error('Error deleting course:', error);
                alert('Failed to delete course.');
            }
        }
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourseId) return;

        try {
            const courseToUpdate = courses.find(c => c.id === editingCourseId);
            if (!courseToUpdate) return;

            const quizDataPayload = newLessonType === 'quiz' ? {
                id: Date.now().toString(),
                title: newLessonTitle,
                questions: newQuizQuestions.map((q, i) => ({
                    id: `q-${Date.now()}-${i}`,
                    text: q.text,
                    options: q.options,
                    correctOptionIndex: q.correct
                }))
            } : null;

            if (editingLessonId) {
                // UPDATE EXISTING LESSON
                const { error } = await supabase
                    .from('lessons')
                    .update({
                        title: newLessonTitle,
                        description: newLessonDesc,
                        type: newLessonType,
                        video_url: newLessonType === 'video' ? newLessonVideo : null,
                        quiz_data: quizDataPayload
                    })
                    .eq('id', editingLessonId);

                if (error) throw error;

                // Update local state
                setCourses(courses.map(course => {
                    if (course.id === editingCourseId) {
                        return {
                            ...course,
                            lessons: course.lessons.map(l => l.id === editingLessonId ? {
                                ...l,
                                title: newLessonTitle,
                                description: newLessonDesc,
                                type: newLessonType,
                                videoUrl: newLessonType === 'video' ? newLessonVideo : undefined,
                                quizData: quizDataPayload || undefined
                            } : l)
                        };
                    }
                    return course;
                }));
                setEditingLessonId(null);
                alert('Lesson updated successfully!');
            } else {
                // INSERT NEW LESSON
                const { data, error } = await supabase
                    .from('lessons')
                    .insert({
                        course_id: editingCourseId,
                        title: newLessonTitle,
                        description: newLessonDesc,
                        type: newLessonType,
                        video_url: newLessonType === 'video' ? newLessonVideo : null,
                        quiz_data: quizDataPayload,
                        order_index: courseToUpdate.lessons.length
                    })
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    const newLesson: Lesson = {
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        type: data.type,
                        videoUrl: data.video_url,
                        quizData: data.quiz_data
                    };

                    setCourses(courses.map(course => {
                        if (course.id === editingCourseId) {
                            return { ...course, lessons: [...course.lessons, newLesson] };
                        }
                        return course;
                    }));
                }
            }

            // Reset Form properly
            setNewLessonTitle('');
            setNewLessonDesc('');
            setNewLessonVideo('');
            setNewLessonType('video');
            setNewQuizQuestions([]);

        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Failed to save lesson. Please try again.');
        }
    };

    const handleAddQuestion = () => {
        if (!currentQuestionText || currentOptions.some(opt => !opt)) return;
        setNewQuizQuestions([...newQuizQuestions, {
            text: currentQuestionText,
            options: [...currentOptions],
            correct: currentCorrectOption
        }]);
        setCurrentQuestionText('');
        setCurrentOptions(['', '', '', '']);
        setCurrentCorrectOption(0);
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
        <div className="min-h-screen bg-slate-50 font-sans flex">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-green/20 rounded-xl flex items-center justify-center">
                            <Shield className="text-brand-green" size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">CED</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wider">INSTRUCTOR</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <button
                        onClick={() => { setViewMode('list'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Video size={20} /></div>
                        <span className="font-medium">My Courses</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('create'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'create' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Plus size={20} /></div>
                        <span className="font-medium">Create Course</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('students'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'students' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Users size={20} /></div>
                        <span className="font-medium">Students</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('settings'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === 'settings' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <div className="w-5 h-5"><Settings size={20} /></div>
                        <span className="font-medium">Settings</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('student-preview'); setIsSidebarOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <div className="w-5 h-5"><Eye size={20} /></div>
                        <span className="font-medium">Student View</span>
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">
                <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20">
                                <Shield className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 text-lg tracking-tight leading-tight">CED</h1>
                                <p className="text-[10px] font-bold text-brand-green tracking-widest uppercase">Instructor Portal</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green font-bold text-sm">
                                {user.name.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                        </div>
                    </div>
                </nav>

                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
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
                                <div className="h-48 w-full relative group">
                                    <img src={activeCourse.thumbnail} alt={activeCourse.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute bottom-6 left-6 text-white max-w-2xl">
                                        <h1 className="text-3xl font-bold">{activeCourse.title}</h1>
                                        <p className="opacity-90 mt-1 line-clamp-2">{activeCourse.description}</p>
                                    </div>

                                    {/* Edit Course Details Button causing Modal/Form Trigger */}
                                    <button
                                        onClick={() => {
                                            setNewCourseTitle(activeCourse.title);
                                            setNewCourseDesc(activeCourse.description);
                                            setNewCourseThumb(activeCourse.thumbnail);
                                            setIsEditingDetails(true);
                                        }}
                                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Edit size={16} /> Edit Details
                                    </button>
                                </div>
                            </div>

                            {/* Edit Details Form - Conditionally Rendered */}
                            {isEditingDetails && (
                                <div className="bg-white rounded-2xl shadow-sm border border-brand-green/20 p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Course Details</h3>
                                    <form onSubmit={(e) => { handleUpdateCourse(e); setIsEditingDetails(false); }} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                            <input value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                            <textarea value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-xl resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Thumbnail URL</label>
                                            <input value={newCourseThumb} onChange={e => setNewCourseThumb(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button type="button" onClick={() => setIsEditingDetails(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                                            <button type="submit" className="px-6 py-2 bg-brand-green text-white rounded-lg font-bold">Save Changes</button>
                                        </div>
                                    </form>
                                </div>
                            )}


                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Add Lesson Form */}
                                <div className="lg:col-span-1">
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                {editingLessonId ? <Edit className="w-5 h-5 text-brand-orange" /> : <Plus className="w-5 h-5 text-brand-green" />}
                                                {editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}
                                            </h2>
                                            {editingLessonId && (
                                                <button
                                                    onClick={() => {
                                                        setEditingLessonId(null);
                                                        setNewLessonTitle('');
                                                        setNewLessonDesc('');
                                                        setNewLessonVideo('');
                                                        setNewLessonType('video');
                                                        setNewQuizQuestions([]);
                                                    }}
                                                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                        <form onSubmit={handleAddLesson} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Lesson Type</label>
                                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewLessonType('video')}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newLessonType === 'video' ? 'bg-white text-brand-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Video Lesson
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewLessonType('quiz')}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newLessonType === 'quiz' ? 'bg-white text-brand-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Quiz
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                                <input
                                                    required
                                                    value={newLessonTitle}
                                                    onChange={(e) => setNewLessonTitle(e.target.value)}
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                                                    placeholder={newLessonType === 'video' ? "e.g., Chapter 1: Basics" : "e.g., Final Quiz"}
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
                                                    placeholder="Content summary..."
                                                />
                                            </div>

                                            {newLessonType === 'video' ? (
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
                                            ) : (
                                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-bold text-sm text-slate-700">Questions ({newQuizQuestions.length})</h3>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <input
                                                            value={currentQuestionText}
                                                            onChange={(e) => setCurrentQuestionText(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                                                            placeholder="Question text..."
                                                        />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {currentOptions.map((opt, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name="correctOption"
                                                                        checked={currentCorrectOption === idx}
                                                                        onChange={() => setCurrentCorrectOption(idx)}
                                                                        className="text-brand-green focus:ring-brand-green"
                                                                    />
                                                                    <input
                                                                        value={opt}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...currentOptions];
                                                                            newOpts[idx] = e.target.value;
                                                                            setCurrentOptions(newOpts);
                                                                        }}
                                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                                                                        placeholder={`Option ${idx + 1}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleAddQuestion}
                                                            disabled={!currentQuestionText || currentOptions.some(o => !o)}
                                                            className="w-full py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-300 disabled:opacity-50 transition-colors"
                                                        >
                                                            Add Question
                                                        </button>
                                                    </div>

                                                    {newQuizQuestions.length > 0 && (
                                                        <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
                                                            {newQuizQuestions.map((q, i) => (
                                                                <div key={i} className="bg-white p-2 rounded border border-slate-200 text-xs">
                                                                    <p className="font-bold truncate">{i + 1}. {q.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={newLessonType === 'quiz' && newQuizQuestions.length === 0}
                                                className={`w-full py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${editingLessonId ? 'bg-brand-orange hover:bg-orange-600 text-white' : 'bg-brand-green hover:bg-green-700 text-white'}`}
                                            >
                                                {editingLessonId ? 'Update Lesson' : (newLessonType === 'video' ? 'Add Lesson' : 'Create Quiz')}
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
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingLessonId(lesson.id);
                                                            setNewLessonTitle(lesson.title);
                                                            setNewLessonDesc(lesson.description);
                                                            setNewLessonType(lesson.type);
                                                            if (lesson.type === 'video') {
                                                                setNewLessonVideo(lesson.videoUrl || '');
                                                            } else if (lesson.quizData) {
                                                                setNewQuizQuestions(lesson.quizData.questions.map(q => ({
                                                                    text: q.text,
                                                                    options: q.options,
                                                                    correct: q.correctOptionIndex
                                                                })));
                                                            }
                                                            // Scroll to form logic could be here
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-brand-orange transition-colors"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLesson(activeCourse.id, lesson.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
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
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Cover Image</label>
                                        <div className="space-y-3">
                                            {newCourseThumb ? (
                                                <div className="relative aspect-video w-full rounded-xl overflow-hidden group">
                                                    <img src={newCourseThumb} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewCourseThumb('')}
                                                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center">
                                                    {isUploading ? (
                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                            <Loader2 size={32} className="animate-spin text-brand-green" />
                                                            <p className="text-sm font-medium">Uploading...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                                                                <Upload size={24} />
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleImageUpload}
                                                                className="hidden"
                                                                id="course-image-upload"
                                                            />
                                                            <label
                                                                htmlFor="course-image-upload"
                                                                className="text-brand-green font-bold text-sm cursor-pointer hover:underline"
                                                            >
                                                                Click to upload
                                                            </label>
                                                            <p className="text-xs text-slate-400">or drag and drop SVG, PNG, JPG (max. 800x400px)</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="w-full border-t border-slate-200"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="bg-white px-2 text-slate-400 text-xs uppercase">Or use URL</span>
                                                </div>
                                            </div>

                                            <input
                                                type="url"
                                                value={newCourseThumb}
                                                onChange={(e) => setNewCourseThumb(e.target.value)}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all text-sm"
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-brand-green text-white py-3.5 rounded-xl hover:bg-green-700 font-bold text-lg transition-all shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transform hover:-translate-y-0.5">
                                        Create Course
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : viewMode === 'students' ? (
                        // STUDENTS ANALYTICS VIEW
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Student Analytics</h2>
                                <p className="text-slate-500">Track student progress and performance across your courses.</p>
                            </div>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                                            <h3 className="text-2xl font-bold text-slate-900">{students.length}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg. Progress</p>
                                            <h3 className="text-2xl font-bold text-slate-900">
                                                {students.length > 0 ? Math.round(students.reduce((acc, curr) => acc + curr.progress, 0) / students.length) : 0}%
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-orange/10 text-brand-orange rounded-xl flex items-center justify-center">
                                            <Award size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg. Quiz Score</p>
                                            <h3 className="text-2xl font-bold text-slate-900">
                                                {students.length > 0 ? Math.round(students.reduce((acc, curr) => acc + curr.quizAvg, 0) / students.length) : 0}%
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Students Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-900">Enrolled Students</h3>
                                    <button className="text-sm font-semibold text-brand-green hover:underline">Export CSV</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Student</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Courses</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Progress</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Quiz Avg.</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {students.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                        No students found. Ensure students have signed in and roles are set.
                                                    </td>
                                                </tr>
                                            ) : (
                                                students.map((student) => (
                                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                                                                    {student.avatar ? (
                                                                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        student.name.charAt(0)
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                                                                    <p className="text-xs text-slate-500">{student.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                                student.status === 'Inactive' ? 'bg-slate-100 text-slate-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {student.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                            {student.coursesEnrolled} Courses
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="w-32">
                                                                <div className="flex justify-between text-xs mb-1 font-medium">
                                                                    <span>{student.progress}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className="bg-brand-green h-full rounded-full"
                                                                        style={{ width: `${student.progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900 text-sm">{student.quizAvg}%</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-slate-400 hover:text-brand-green transition-colors font-semibold text-sm">
                                                                View Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'settings' ? (
                        // SETTINGS VIEW
                        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-2 text-slate-500 hover:text-brand-orange transition-colors font-medium mb-6"
                            >
                                <ArrowLeft size={20} /> Back to Dashboard
                            </button>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-100">
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                        <Settings className="text-brand-green" /> Account Settings
                                    </h2>
                                    <p className="text-slate-500 mt-1">Manage your profile and account preferences.</p>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-4xl font-bold border-4 border-white shadow-lg">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                user.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green mt-2">
                                                <Shield size={12} /> INSTRUCTOR
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                                <input
                                                    type="text"
                                                    value={user.name}
                                                    readOnly
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                                <input
                                                    type="email"
                                                    value={user.email}
                                                    readOnly
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        {!isChangingPassword ? (
                                            <button
                                                onClick={() => setIsChangingPassword(true)}
                                                className="text-brand-green font-semibold hover:underline text-sm"
                                            >
                                                Change Password
                                            </button>
                                        ) : (
                                            <form onSubmit={handleChangePassword} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                                                    <input
                                                        type="password"
                                                        required
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                                                        placeholder="••••••••"
                                                    />
                                                </div>

                                                {passwordMessage && (
                                                    <div className={`text-xs font-medium p-2 rounded ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {passwordMessage.text}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        className="flex-1 py-2 bg-brand-green text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                                                    >
                                                        Update
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsChangingPassword(false);
                                                            setPasswordMessage(null);
                                                            setNewPassword('');
                                                            setConfirmPassword('');
                                                        }}
                                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'student-preview' ? (
                        <StudentDashboard
                            courses={courses}
                            onLogout={onLogout}
                            user={user}
                            onExitPreview={() => setViewMode('list')}
                        />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {courses.map((course) => (
                                        <div key={course.id} className="group bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-green/10 transition-all duration-300 flex flex-col">
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
                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-brand-green transition-colors">{course.title}</h3>
                                                    {course.instructorName && (
                                                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{course.instructorName}</p>
                                                    )}
                                                    <p className="text-slate-500 line-clamp-2 mb-4 text-sm leading-relaxed">{course.description}</p>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCourseId(course.id);
                                                            setViewMode('edit');
                                                        }}
                                                        className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-bold text-xs"
                                                    >
                                                        <Edit size={14} /> Manage
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCourse(course.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Course"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </main>


            </div >
        </div >
    );
};
