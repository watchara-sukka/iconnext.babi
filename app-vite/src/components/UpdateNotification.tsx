import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, AlertCircle, Info } from 'lucide-react';


export const UpdateNotification: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [version, setVersion] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const cleanup1 = window.api.onUpdateAvailable((info) => {
            setVersion(info.version);
            setStatus('available');
        });

        const cleanup2 = window.api.onUpdateProgress((progressObj) => {
            setStatus('downloading');
            setProgress(Math.round(progressObj.percent));
        });

        const cleanup3 = window.api.onUpdateDownloaded(() => {
            setStatus('downloaded');
        });

        const cleanup4 = window.api.onUpdateError((msg) => {
            setError(msg);
            setStatus('error');
        });

        return () => {
            cleanup1();
            cleanup2();
            cleanup3();
            cleanup4();
        };
    }, []);

    if (status === 'idle') return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {status === 'available' && (
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Info size={18} />
                            </div>
                        )}
                        {status === 'downloading' && (
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg animate-pulse">
                                <Download size={18} />
                            </div>
                        )}
                        {status === 'downloaded' && (
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                <RefreshCw size={18} />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                                <AlertCircle size={18} />
                            </div>
                        )}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {status === 'available' && 'พบเวอร์ชันใหม่!'}
                            {status === 'downloading' && 'กำลังดาวน์โหลด...'}
                            {status === 'downloaded' && 'พร้อมติดตั้งแล้ว'}
                            {status === 'error' && 'เกิดข้อผิดพลาด'}
                        </span>
                    </div>
                    <button
                        onClick={() => setStatus('idle')}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {status === 'available' && `เวอร์ชัน ${version} พร้อมให้อัปเดตแล้ว`}
                        {status === 'downloading' && `กำลังดาวน์โหลดส่วนเสริมใหม่ (${progress}%)`}
                        {status === 'downloaded' && 'ดาวน์โหลดเสร็จสมบูรณ์ คลิกเพื่ออัปเดตและเริ่มแอปใหม่'}
                        {status === 'error' && error}
                    </p>

                    {status === 'downloading' && (
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        {status === 'available' && (
                            <button
                                onClick={() => window.api.downloadUpdate()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                ดาวน์โหลด
                            </button>
                        )}
                        {status === 'downloaded' && (
                            <button
                                onClick={() => window.api.quitAndInstall()}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                อัปเดตและเริ่มใหม่
                            </button>
                        )}
                        {status === 'available' && (
                            <button
                                onClick={() => window.api.openReleasePage()}
                                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg transition-colors underline decoration-zinc-300 dark:decoration-zinc-600 underline-offset-4"
                            >
                                รายละเอียด
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
