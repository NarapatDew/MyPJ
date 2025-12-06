import React, { useEffect } from 'react';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { supabase } from '../lib/supabase';

interface EmailConfirmationSuccessProps {
    onContinue: () => void;
}

export const EmailConfirmationSuccess: React.FC<EmailConfirmationSuccessProps> = ({ onContinue }) => {
    useEffect(() => {
        // Verify the session after email confirmation
        const verifySession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log('Email confirmed successfully for:', session.user.email);
                }
            } catch (error) {
                console.error('Error verifying session:', error);
            }
        };
        verifySession();
    }, []);

    return (
        <AuthLayout
            title="Email ยืนยันเรียบร้อยแล้ว"
            subtitle="ยินดีต้อนรับสู่ CED E-Learning"
        >
            <div className="text-center space-y-6">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                {/* Success Message */}
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900">
                        ยืนยันอีเมลสำเร็จ!
                    </h3>
                    <p className="text-slate-600">
                        บัญชีของคุณได้รับการยืนยันแล้ว คุณสามารถเข้าสู่ระบบได้เลย
                    </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                    <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                            <p className="font-medium mb-1">พร้อมเริ่มเรียนแล้ว!</p>
                            <p className="text-blue-700">
                                กดปุ่มด้านล่างเพื่อเข้าสู่ระบบและเริ่มต้นการเรียนรู้ของคุณ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    onClick={onContinue}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    เข้าสู่ระบบ
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </AuthLayout>
    );
};

