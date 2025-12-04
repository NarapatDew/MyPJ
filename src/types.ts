export type Role = 'teacher' | 'student';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    duration?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    instructorId: string;
    lessons: Lesson[];
}

export interface StudentProgress {
    [courseId: string]: {
        [lessonId: string]: boolean; // true if completed
    };
}
