import { AnomalyEvent } from '@prisma/client';

export type ActionPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface StoreAction {
  store_id: number;
  anomaly_type: string;
  severity: string;
  root_cause: string;
  message?: string;
  recommended_action: string;
  owner_role: string;
  priority: ActionPriority;
  deadline_hours: number;
  confidence_score: number;
  created_at_iso: string;
}

export class RecommendationEngine {
    
    // Strict priority mapping based on anomaly severity
    private static evaluatePriority(severity: string): ActionPriority {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'URGENT';
            case 'HIGH': return 'HIGH';
            case 'MEDIUM': return 'MEDIUM';
            default: return 'LOW';
        }
    }

    private static evaluateDeadline(priority: ActionPriority): number {
        switch (priority) {
            case 'URGENT': return 8;
            case 'HIGH': return 24;
            case 'MEDIUM': return 48;
            case 'LOW': return 72;
        }
    }

    private static evaluateRootCause(anomaly_type: string): string {
        if (anomaly_type.includes('YIELD')) return "PORTION_CONTROL_FAILURE";
        if (anomaly_type.includes('SHRINK') || anomaly_type.includes('GHOST_SHIFT')) return "UNACCOUNTED_LOSS";
        if (anomaly_type.includes('INVOICE') || anomaly_type.includes('RECEIVING')) return "INVOICE_MISMATCH";
        if (anomaly_type.includes('CONFLICT') || anomaly_type === 'SIGNAL_CONFLICT_DETECTED') return "DATA_INCONSISTENCY";
        if (anomaly_type === 'SYSTEM_SUPPRESSION_LOW_TRUST') return "MISSING_OR_UNRELIABLE_DATA";
        return anomaly_type; // Fallback to raw string, though typically fails contract if not recognized.
    }

    private static evaluateAction(anomaly_type: string, severity: string): { recommended_action: string, owner_role: string } | null {
        if (anomaly_type.includes('YIELD')) {
            if (severity === 'CRITICAL' || severity === 'HIGH') {
                 return { recommended_action: "Review portion control and operational yield losses immediately.", owner_role: "STORE_MANAGER" };
            }
            return { recommended_action: "Monitor portion consistency. Initiate random weight checks.", owner_role: "KITCHEN_MANAGER" };
        }
        
        if (anomaly_type.includes('SHRINK') || anomaly_type.includes('GHOST_SHIFT')) {
             if (severity === 'CRITICAL' || severity === 'HIGH') {
                 return { recommended_action: "Immediate cold room audit. Forced blind recount.", owner_role: "STORE_MANAGER" };
             }
             return { recommended_action: "Review transfer and return reports. Verify blind waste.", owner_role: "KITCHEN_MANAGER" };
        }

        if (anomaly_type.includes('INVOICE')) {
             return { recommended_action: "Validate receiving weights against vendor Invoice via DocDigger.", owner_role: "STORE_MANAGER" };
        }

        if (anomaly_type.includes('RECEIVING')) {
             return { recommended_action: "Inspect box integrity and validate receiving temperature before releasing to inventory.", owner_role: "RECEIVING_CLERK" };
        }

        if (anomaly_type.includes('CONFLICT')) {
             return { recommended_action: "Audit variance between theoretical consumption and static inventory on the local platform.", owner_role: "FINANCE" };
        }

        // Return null instead of vague fallback to ensure Fail-Closed policy
        return null;
    }

    public static generateActions(anomalies: AnomalyEvent[]): StoreAction[] {
        const actionMap = new Map<string, StoreAction>();

        for (const anomaly of anomalies) {
            // Hard Ignore Conditions
            if (anomaly.confidence < 65) continue;
            if (anomaly.anomaly_type === 'SYSTEM_SUPPRESSION_LOW_TRUST') continue;
            if (!anomaly.store_id) continue;

            const priority = this.evaluatePriority(anomaly.severity);
            const deadline = this.evaluateDeadline(priority);
            
            const actionVector = this.evaluateAction(anomaly.anomaly_type, anomaly.severity);
            const rootCause = this.evaluateRootCause(anomaly.anomaly_type);
            
            // STRICT FAIL-CLOSED: if any critical parameter is unresolved, ignore execution payload
            if (!actionVector || !actionVector.owner_role || !actionVector.recommended_action || !rootCause) {
                continue;
            }

            const dedupeKey = `${anomaly.store_id}_${anomaly.anomaly_type}_${actionVector.owner_role}`;

            const newAction: StoreAction = {
                store_id: anomaly.store_id,
                anomaly_type: anomaly.anomaly_type,
                severity: anomaly.severity,
                root_cause: rootCause,
                message: anomaly.message, // Provided as background context but NOT semantic driver
                recommended_action: actionVector.recommended_action,
                owner_role: actionVector.owner_role,
                priority: priority,
                deadline_hours: deadline,
                confidence_score: Math.max(0, Math.min(100, Math.round(anomaly.confidence))),
                created_at_iso: new Date(anomaly.created_at).toISOString()
            };

            // Deduplication Logic - Keep highest severity (weights evaluated on priority)
            const weights: Record<ActionPriority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            if (actionMap.has(dedupeKey)) {
                const existing = actionMap.get(dedupeKey)!;
                if (weights[newAction.priority] > weights[existing.priority]) {
                    actionMap.set(dedupeKey, newAction);
                } else if (weights[newAction.priority] === weights[existing.priority]) {
                    // If priorities match, keep the most recent
                    if (newAction.created_at_iso > existing.created_at_iso) {
                        actionMap.set(dedupeKey, newAction);
                    }
                }
            } else {
                actionMap.set(dedupeKey, newAction);
            }
        }

        const actions = Array.from(actionMap.values());

        // Sort globally (Priority -> Severity -> Timestamp)
        const priorityWeights: Record<ActionPriority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        
        return actions.sort((a, b) => {
            if (priorityWeights[a.priority] !== priorityWeights[b.priority]) {
                return priorityWeights[b.priority] - priorityWeights[a.priority]; // Descending priority
            }
            if (severityWeights[a.severity] !== severityWeights[b.severity]) {
                return severityWeights[b.severity] - severityWeights[a.severity]; // Descending severity
            }
            // Descending timestamp (newest first)
            return b.created_at_iso.localeCompare(a.created_at_iso);
        });
    }
}
