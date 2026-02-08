import React from 'react';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';

export const ExecutiveDashboard = () => {
    return (
        <DashboardLayout>
            <div className="p-4">
                <ExecutiveSummary />
            </div>
        </DashboardLayout>
    );
};
