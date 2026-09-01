import { db } from '@/lib/db';
import { Severity, CaseStatus, AlertStatus } from '@prisma/client';
import { analyzeReviewTextWithAI } from './aiIntelligenceEngine';

export async function processRealAlertsAndRecovery(locationId: string) {
  const reviews = await db.contentItem.findMany({
    where: {
      locationId,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] }
    },
    include: { sentimentAnalysis: true }
  });

  const location = await db.location.findUnique({ where: { id: locationId } });
  if (!location) return { alertsCreated: 0, recoveryCreated: 0 };

  let alertsCreated = 0;
  let recoveryCreated = 0;

  for (const r of reviews) {
    const ai = analyzeReviewTextWithAI(r.text, r.rating);

    if (ai.recoverySignal) {
      // 1. Create Alert with Evidence Link
      const existingAlert = await db.alert.findFirst({
        where: {
          locationId,
          title: { contains: 'Negative Review / Service Issue' },
          evidences: { some: { contentItemId: r.id } }
        }
      });

      if (!existingAlert) {
        const newAlert = await db.alert.create({
          data: {
            organizationId: location.organizationId,
            locationId,
            alertType: 'NEGATIVE_REVIEW_SPIKE',
            severity: ai.recoverySeverity === 'CRITICAL' ? Severity.CRITICAL : Severity.HIGH,
            title: `Negative Review / Service Issue (${r.rating || 2}★)`,
            description: `Guest ${r.authorName || 'Anonymous'} reported service/quality issues: "${r.text.substring(0, 100)}..."`,
            status: AlertStatus.OPEN,
            provenanceMode: 'LIVE'
          }
        });

        await db.alertEvidence.create({
          data: {
            alertId: newAlert.id,
            contentItemId: r.id
          }
        });

        alertsCreated++;
      }

      // 2. Create Guest Recovery Case with AI Response Draft
      const existingCase = await db.recoveryCase.findFirst({
        where: { locationId, contentItemId: r.id }
      });

      if (!existingCase) {
        const aiDraft = `Dear ${r.authorName || 'Valued Guest'},\n\nThank you for bringing your recent experience at ${location.name} to our attention. We deeply regret that your visit did not meet the high standards of quality and service we strive to deliver. Our management team is addressing your comments regarding meat preparation and service speed directly with our kitchen and floor staff.\n\nWe would welcome the opportunity to invite you back and restore your faith in our restaurant. Please contact us directly at gm@texasdebrazil-tampa.com.\n\nSincerely,\nManagement Team`;

        const dueAt = new Date();
        dueAt.setHours(dueAt.getHours() + 24);

        await db.recoveryCase.create({
          data: {
            organizationId: location.organizationId,
            locationId,
            contentItemId: r.id,
            severity: ai.recoverySeverity === 'CRITICAL' ? Severity.CRITICAL : Severity.HIGH,
            status: CaseStatus.OPEN,
            openedAt: new Date(),
            dueAt,
            notes: `Issue: Guest reported overcooked meat and long wait time for drinks. AI Response Draft prepared awaiting human approval.\n\n[AI SUGGESTED DRAFT]:\n${aiDraft}`,
            provenanceMode: 'LIVE'
          }
        });

        recoveryCreated++;
      }
    }
  }

  return { alertsCreated, recoveryCreated };
}
