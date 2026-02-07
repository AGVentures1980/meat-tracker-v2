import React from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { Settings } from 'lucide-react';

interface PlaceholderProps {
    title: string;
}

export const PlaceholderPage = ({ title }: PlaceholderProps) => {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-[#1a1a1a] p-6 rounded-full border border-[#333] mb-6">
                    <Settings className="w-12 h-12 text-[#FF9F1C] animate-spin-slow" />
                </div>
                <h1 className="text-2xl font-mono font-bold text-white mb-2">{title}</h1>
                <p className="text-gray-500 font-mono text-sm max-w-md">
                    MODULE INITIALIZATION PENDING...
                    <br />
                    This feature is scheduled for Phase 7 implementation.
                </p>
                <div className="mt-8 flex gap-2">
                    <span className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[10px] text-gray-600 font-mono rounded">STATUS: DEVELOPMENT</span>
                    <span className="px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[10px] text-gray-600 font-mono rounded">PRIORITY: P2</span>
                </div>
            </div>
        </DashboardLayout>
    );
};
