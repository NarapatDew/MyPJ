import React, { useState } from 'react';
import { User } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import type { Role } from '../types';

interface LoginScreenProps {
    onLogin: (email: string, role: Role) => void;
    onSwitchToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('student');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            onLogin(email, role);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to access your courses and continue learning."
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                        Email address
                    </label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        I am a...
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${role === 'student'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('teacher')}
                            className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${role === 'teacher'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Teacher
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    Sign in
                </button>

                <div className="text-center mt-4">
                    <p className="text-sm text-slate-600">
                        Don't have an account?{' '}
                        <button
                            type="button"
                            onClick={onSwitchToRegister}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Create one now
                        </button>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};
