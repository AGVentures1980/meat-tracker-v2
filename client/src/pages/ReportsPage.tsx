import React from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';

export const ReportsPage = () => {
    return (
        <DashboardLayout>
            <div className="p-8 text-white">
                <h1 className="text-2xl font-bold mb-4">Reports</h1>
                <p className="text-gray-400">Detailed reports will be valid here.</p>
            </div>
        </DashboardLayout>
    );
};
