import React from 'react';
import { DockReceivingPortal } from '../components/operations/DockReceivingPortal';
import { ProductionRecordPortal } from '../components/operations/ProductionRecordPortal';
import { InventorySubmitPortal } from '../components/operations/InventorySubmitPortal';

// === MINIMAL OPERATIONAL UI ARCHITECTURE FOR GO-LIVE ===
// Pure Shell routing layout

export default function OperationalHub() {
    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">BRASA Operational Hub</h1>
            <DockReceivingPortal />
            <ProductionRecordPortal />
            <InventorySubmitPortal />
        </div>
    );
}
