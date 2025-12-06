export type Role = 'teacher' | 'student';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Quiz {
    id: string;
    title: string;
    questions: Question[];
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'quiz';
    videoUrl?: string;
    quizData?: Quiz;
    duration?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    instructorId: string;
    instructorName?: string;
    lessons: Lesson[];
}

export interface StudentProgress {
    [courseId: string]: {
        [lessonId: string]: boolean | number; // boolean for video (completed), number for quiz (score)
    };
}

export interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    role: Role;
    email?: string;
    updated_at: string;
}

export interface DBProgress {
    id: number;
    user_id: string;
    course_id: string;
    lesson_id: string;
    completed: boolean;
    score: number;
    updated_at: string;
}

export interface Enrollment {
    user_id: string;
    course_id: string;
    enrolled_at: string;
}
