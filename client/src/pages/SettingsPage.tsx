import React from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';

export const SettingsPage = () => {
    return (
        <DashboardLayout>
            <div className="p-8 text-white">
                <h1 className="text-2xl font-bold mb-4">System Settings</h1>
                <p className="text-gray-400">Configuration options will appear here.</p>
            </div>
        </DashboardLayout>
    );
};
