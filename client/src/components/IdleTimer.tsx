import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock } from 'lucide-react';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const COUNTDOWN_DURATION = 30; // 30 seconds

export const IdleTimer = () => {
    const { user, logout } = useAuth();
    const [isIdle, setIsIdle] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);

    const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetTimer = () => {
        if (!user) return;

        // If currently in warning state, dismiss it
        if (isIdle) {
            setIsIdle(false);
            setCountdown(COUNTDOWN_DURATION);
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        }

        // Reset the main idle timer
        if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
        }

        idleTimeoutRef.current = setTimeout(() => {
            setIsIdle(true);
        }, IDLE_TIMEOUT);
    };

    const handleLogout = () => {
        setIsIdle(false);
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        logout();
    };

    // Effect for handling the countdown when idle state triggers
    useEffect(() => {
        if (isIdle) {
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        handleLogout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [isIdle]);

    // Effect for setting up event listeners
    useEffect(() => {
        if (!user) return;

        const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keydown'];

        // Initial setup
        resetTimer();

        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [user, isIdle]); // Re-bind if user status changes or idle state toggles

    if (!isIdle || !user) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border-2 border-[#C5A059] rounded-lg p-8 max-w-md w-full text-center shadow-2xl animate-fade-in relative overflow-hidden">
                {/* Progress Bar Background */}
                <div
                    className="absolute bottom-0 left-0 h-1 bg-[#C5A059] transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / COUNTDOWN_DURATION) * 100}%` }}
                />

                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-amber-500/20 rounded-full animate-pulse">
                        <Clock className="w-12 h-12 text-[#C5A059]" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">
                    Session Expiring
                </h2>

                <p className="text-gray-400 mb-6">
                    For your security, you will be logged out in
                </p>

                <div className="text-5xl font-mono font-bold text-[#C5A059] mb-8">
                    {countdown}s
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={resetTimer}
                        className="w-full py-3 bg-[#C5A059] text-black font-bold rounded hover:bg-[#b08d4b] transition-colors uppercase tracking-widest"
                    >
                        I'm Still Here
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full py-2 text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-wider"
                    >
                        Log Out Now
                    </button>
                </div>
            </div>
        </div>
    );
};
