import React from 'react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative overflow-hidden">
                {/* Decorative background blob */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

                <div className="mx-auto w-full max-w-sm lg:w-96 relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <img
                            src="/assets/dept-logo.png"
                            alt="Department Logo"
                            className="h-12 w-auto object-contain"
                        />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-slate-900 leading-none tracking-tight">CED</span>
                            <span className="text-sm font-medium text-brand-green tracking-wider">E-LEARNING</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
                        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
                    </div>

                    {children}
                </div>

                {/* Footer Logo */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-50">
                    <p className="text-xs text-slate-400">© 2025 Computer Education Department</p>
                </div>
            </div>

            {/* Right Side - Image & Decor */}
            <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/90 to-brand-dark/90 z-10 mix-blend-multiply" />
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/assets/auth-hero.png"
                    alt="Faculty Atmosphere"
                />

                <div className="absolute inset-0 z-20 flex flex-col justify-end p-16 text-white">
                    <div className="w-16 h-1 bg-brand-orange mb-6" />
                    <blockquote className="space-y-4">
                        <p className="text-2xl font-medium leading-relaxed drop-shadow-md">
                            "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
                        </p>
                        <footer className="flex items-center gap-4 pt-4 border-t border-white/20">
                            <img src="/assets/faculty-logo.png" alt="Faculty Logo" className="h-16 w-auto drop-shadow-lg" />
                            <div className="text-sm font-medium opacity-90">
                                <div className="font-bold text-lg">Faculty of Technical Education</div>
                                <div className="text-brand-orange font-semibold">King Mongkut's University of Technology North Bangkok</div>
                            </div>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    );
};
