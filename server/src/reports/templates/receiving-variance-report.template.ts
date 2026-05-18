export interface ReceivingVarianceReportData {
    auditId: string;
    location: string;
    storeId: string | number;
    regionId: string;
    date: string;
    supplierName: string;
    supplierCode: string;
    freightId: string;
    scaleId: string;
    scaleCalibration: string;
    temperature: string;
    receiverInitials: string;
    complianceStatus: 'COMPLIANT' | 'BREACH' | 'WARNING';
    traceChainId: string;
    checksum: string;
    templateVersion: string;
    generatedByUser: string;
    items: Array<{
        productName: string;
        itemCode: string;
        expectedWeight: number;
        actualWeight: number;
        varianceWeight: number;
        variancePct: number;
        status: 'CRITICAL' | 'WARNING' | 'OK';
        comments: string;
    }>;
}

export const generateReceivingVarianceReportHtml = (data: ReceivingVarianceReportData): string => {
    const itemsHtml = data.items.map(item => {
        const statusClass = item.status === 'CRITICAL' ? 'heavy-red' : item.status === 'WARNING' ? 'heavy-yellow' : 'heavy-green';
        const flagClass = item.status === 'CRITICAL' ? 'flag-red' : item.status === 'WARNING' ? 'flag-yellow' : 'flag-green';
        
        return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: #ffffff;">${item.productName}</div>
                    <span class="sub-data">SKU: ${item.itemCode} // Purge Spec: &lt;1.5%</span>
                </td>
                <td>${item.expectedWeight.toFixed(2)} Lbs</td>
                <td class="${statusClass}">${item.actualWeight.toFixed(2)} Lbs</td>
                <td class="${statusClass}">${item.varianceWeight.toFixed(2)} Lbs</td>
                <td class="${statusClass}">${item.variancePct.toFixed(2)}%</td>
                <td><span class="status-flag ${flagClass}">${item.status}</span></td>
                <td><span class="sub-data">${item.comments}</span></td>
            </tr>
        `;
    }).join('');

    const complianceFlagClass = data.complianceStatus === 'BREACH' ? 'flag-red' : data.complianceStatus === 'WARNING' ? 'flag-yellow' : 'flag-green';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receiving Variance Audit Report - ${data.auditId}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #08080a;
            color: #d4d4d8;
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .page {
            width: 8.5in;
            height: 11in;
            background-color: #08080a;
            position: relative;
            box-sizing: border-box;
            padding: 0.35in 0.45in;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255, 255, 255, 0.03);
            overflow: hidden;
        }

        /* Header Area - Utilitarian & Asymmetrical */
        .header {
            display: grid;
            grid-template-columns: 2.2fr 1fr;
            border-bottom: 2px solid #1f1f23;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        .header-left .org-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #52525b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .header-left .doc-title {
            font-size: 14pt;
            font-weight: 900;
            color: #ffffff;
            margin: 0;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }

        .header-right {
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }

        .status-flag-massive {
            padding: 3px 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border-radius: 1px;
        }

        /* Audit Metadata - Raw Grid Table */
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border: 1px solid #1f1f23;
            background: rgba(255, 255, 255, 0.01);
        }

        .meta-table td {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            padding: 3px 6px;
            border: 1px solid #1f1f23;
        }

        .meta-table td.label {
            color: #52525b;
            text-transform: uppercase;
            font-weight: 700;
            width: 15%;
        }

        .meta-table td.value {
            color: #a1a1aa;
            font-weight: 500;
        }

        /* Sections */
        h2 {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #52525b;
            margin: 0 0 6px 0;
            padding-bottom: 2px;
            border-bottom: 1px solid #1f1f23;
        }

        .section {
            margin-bottom: 12px;
        }

        /* Data Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            margin-bottom: 4px;
        }

        .data-table th {
            background: rgba(255, 255, 255, 0.01);
            color: #52525b;
            font-weight: 700;
            text-transform: uppercase;
            text-align: left;
            padding: 4px 5px;
            border-bottom: 1px solid #1f1f23;
            border-top: 1px solid #1f1f23;
        }

        .data-table td {
            padding: 5px;
            border-bottom: 1px solid #1f1f23;
            color: #a1a1aa;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .heavy-red { color: #ef4444; font-weight: 700; }
        .heavy-yellow { color: #fbbf24; font-weight: 700; }
        .heavy-green { color: #4ade80; font-weight: 700; }

        /* Findings List */
        ul.findings-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        ul.findings-list li {
            font-size: 7.5pt;
            line-height: 1.35;
            color: #a1a1aa;
            margin-bottom: 3px;
            padding-left: 10px;
            position: relative;
        }

        ul.findings-list li::before {
            content: '■';
            position: absolute;
            left: 0;
            top: 2px;
            font-size: 5pt;
            color: #3f3f46;
        }
        
        ul.findings-list li.alert::before {
            color: #ef4444;
        }

        ul.findings-list li strong {
            color: #e4e4e7;
            font-weight: 700;
        }

        .sub-data {
            display: block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 6pt;
            color: #52525b;
            margin-top: 1px;
        }

        /* Status Flags */
        .status-flag {
            padding: 1px 3px;
            font-size: 5.5pt;
            font-weight: 800;
            text-transform: uppercase;
        }
        .flag-red { background: rgba(220, 38, 38, 0.1); color: #ef4444; border: 1px solid rgba(220, 38, 38, 0.2); }
        .flag-yellow { background: rgba(234, 179, 8, 0.08); color: #fbbf24; border: 1px solid rgba(234, 179, 8, 0.2); }
        .flag-green { background: rgba(34, 197, 94, 0.08); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }

        /* Footer */
        .footer {
            margin-top: auto;
            border-top: 1px solid #1f1f23;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-family: 'JetBrains Mono', monospace;
            font-size: 6pt;
            color: #3f3f46;
            text-transform: uppercase;
        }
    </style>
</head>
<body>

    <div class="page">
        
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="org-title">BRASA Governance Engine</div>
                <h1 class="doc-title">Receiving Variance Audit</h1>
            </div>
            <div class="header-right">
                <span class="status-flag ${complianceFlagClass}" style="padding: 3px 8px; font-size: 8pt;">${data.complianceStatus}</span>
            </div>
        </div>

        <!-- Audit Metadata -->
        <table class="meta-table">
            <tr>
                <td class="label">Audit Trace ID</td>
                <td class="value">${data.auditId}</td>
                <td class="label">Date / Time</td>
                <td class="value">${data.date}</td>
            </tr>
            <tr>
                <td class="label">Location</td>
                <td class="value">${data.location} (ID: ${data.storeId})</td>
                <td class="label">Supplier Code</td>
                <td class="value">${data.supplierCode} (${data.supplierName})</td>
            </tr>
            <tr>
                <td class="label">Freight ID</td>
                <td class="value">${data.freightId}</td>
                <td class="label">Scale ID / Cal</td>
                <td class="value">${data.scaleId} (${data.scaleCalibration})</td>
            </tr>
            <tr>
                <td class="label">Inbound Temp</td>
                <td class="value">${data.temperature}</td>
                <td class="label">Receiver Initials</td>
                <td class="value">${data.receiverInitials}</td>
            </tr>
        </table>

        <!-- 1. Incident Diagnosis -->
        <div class="section">
            <h2>1. Incident Diagnostics Summary</h2>
            <ul class="findings-list">
                <li class="alert"><strong>Purge Exception Logged:</strong> Vacuum sealed primal liquid purge weight exceeded structural specification (1.5% maximum allowable limit).</li>
                <li class="alert"><strong>Invoice-to-Dock Weight Variance:</strong> Manifested billing weight significantly exceeded scale weight. Variance outside contractual margins.</li>
                <li><strong>Scale Integrity Log:</strong> Scale calibration checked and locked prior to inbound tare procedure. Data integrity verified.</li>
            </ul>
        </div>

        <!-- 2. Audit Ledger -->
        <div class="section">
            <h2>2. Forensic Weight Audit Ledger</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product Profile</th>
                        <th>Invoiced Wt</th>
                        <th>Scale Wt</th>
                        <th>Net Var</th>
                        <th>Var %</th>
                        <th>Compliance</th>
                        <th>Diagnostics / Resolution</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <!-- 3. Corrective Enforcement Directives -->
        <div class="section" style="margin-bottom: 0;">
            <h2>3. Directives & Enforcement Pipeline</h2>
            <ul class="findings-list">
                <li class="alert"><strong>Contractual Credit Filed:</strong> Immediate credit note filed against supplier ${data.supplierName} invoice cycle.</li>
                <li class="alert"><strong>Mandatory Re-weigh:</strong> All subsequent deliveries from supplier ${data.supplierName} placed on a 14-day 100% scale verification loop.</li>
                <li><strong>Operations Alert:</strong> Tampa Area Director flagged. Action trace ID logged to central compliance engine.</li>
            </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
            <span>Generated by BRASA Governance Engine</span>
            <span>Version: ${data.templateVersion} // Hash: ${data.checksum.substring(0, 12)}</span>
            <span>Trace ID: ${data.traceChainId}</span>
            <span>Generated By: ${data.generatedByUser} // CONFIDENTIAL</span>
        </div>

    </div>

</body>
</html>
    `;
};
