import React, { useEffect, useState } from 'react';
import { X, Info, Monitor, ShieldCheck, RefreshCw } from 'lucide-react';

interface VersionModalProps {
    onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ onClose }) => {
    const [info, setInfo] = useState<{ version: string; platform: string; arch: string } | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        window.api.getInfo().then(setInfo);
    }, []);

    const handleCheckUpdate = () => {
        setChecking(true);
        window.api.checkForUpdates();
        setTimeout(() => setChecking(false), 2000);
    };

    if (!info) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Info size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">เกี่ยวกับซอฟต์แวร์</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">เวอร์ชันแอป</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">
                                v{info.version}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <Monitor size={18} className="text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">ระบบปฏิบัติการ</span>
                            </div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                                {info.platform} ({info.arch})
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={handleCheckUpdate}
                            disabled={checking}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                        >
                            <RefreshCw size={18} className={checking ? "animate-spin" : ""} />
                            {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบเวอร์ชันใหม่'}
                        </button>

                        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                            © 2026 IconNext Babi Portal. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
