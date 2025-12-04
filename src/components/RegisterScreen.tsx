import React, { useState } from 'react';
import { User, Lock, Mail, ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthLayout } from './AuthLayout';
import type { Role } from '../types';

interface RegisterScreenProps {
    onSwitchToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<Role>('student');
    const [secretCode, setSecretCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const TEACHER_SECRET_CODE = 'CED-2025';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting registration form...', { name, email, role });
        setError('');
        setLoading(true);

        if (role === 'teacher' && secretCode !== TEACHER_SECRET_CODE) {
            console.error('Invalid secret code');
            setError('Invalid Faculty Access Code. Please contact the administrator.');
            setLoading(false);
            return;
        }

        try {
            console.log('Calling supabase.auth.signUp...');
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role,
                    },
                },
            });

            console.log('Supabase response:', { data, error });

            if (error) throw error;

            if (data.user) {
                console.log('Registration successful');
                setShowSuccess(true);
                // We don't call onRegister immediately here because we want to show the verification screen first.
                // If auto-login happens (email verification off), App.tsx will handle the redirect anyway.
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    if (showSuccess) {
        return (
            <AuthLayout
                title="Check your email"
                subtitle="We've sent you a verification link."
            >
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>

                    <div className="space-y-2">
                        <p className="text-slate-600">
                            We sent a confirmation email to:
                        </p>
                        <p className="font-medium text-slate-900 text-lg">{email}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                        <p>Click the link in the email to activate your account and sign in.</p>
                    </div>

                    <button
                        onClick={onSwitchToLogin}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Back to Sign in
                    </button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join the CED community today."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">Email address</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
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
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            placeholder="••••••••"
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        I want to join as a...
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

                {role === 'teacher' && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <label className="block text-sm font-medium text-slate-700">
                            Faculty Access Code <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                placeholder="Enter secret code"
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Required for teacher registration. Ask your administrator.
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Create Account'
                    )}
                </button>

                <div className="text-center mt-4">
                    <p className="text-sm text-slate-600">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};
