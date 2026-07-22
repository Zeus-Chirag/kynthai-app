import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auth';
import { jsonOk, jsonError, requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { response, user: sessionUser } = await requireAuth(req);
  if (response || !sessionUser) return response!;

  try {
    const userId = sessionUser.id;

    // Audit: consultation preparation (reads medication, journal, lab sensitive health data)
    await logAudit(sessionUser.id, 'consultation.prep', { resourceType: 'ConsultationNote' });

    const isDemo = sessionUser.isDemo || false;

    if (isDemo) {
      return jsonOk({
        patientName: sessionUser.name,
        visitDate: new Date().toISOString(),
        medications: [
          { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'Twice daily' },
          { name: 'Atorvastatin 10mg', dosage: '1 tablet', frequency: 'Once daily at night' },
        ],
        adherence: { totalDoses: 60, taken: 54, percentage: 90 },
        symptoms: [
          {
            date: new Date(Date.now() - 86400000).toISOString(),
            symptoms: ['Mild headache', 'Fatigue'],
            severity: 2,
          },
        ],
        questions: ['Should I take Metformin with food?', 'Any new drug interactions?'],
        allergies: [],
        conditions: ['Type 2 Diabetes', 'Hypertension'],
        labResults: [
          { test: 'Blood Sugar (Fasting)', value: '142 mg/dL', status: 'borderline' },
          { test: 'Lipid Profile', value: 'Total: 210 mg/dL', status: 'normal' },
        ],
      });
    }

    // Fetch real data
    const [medications, conditions, user] = await Promise.all([
      db.medication.findMany({
        where: { userId, active: true },
        select: { id: true, name: true, dosage: true, frequency: true },
      }),
      db.chronicCondition.findMany({
        where: { patientId: userId, active: true },
        select: { name: true },
      }),
      db.user.findUnique({ where: { id: userId }, select: { allergies: true } }),
    ]);

    const medIds = medications.map(m => m.id);
    const reminders =
      medIds.length > 0
        ? await db.reminder.findMany({
            where: { medicationId: { in: medIds } },
            select: { status: true },
          })
        : [];
    const totalDoses = reminders.length;
    const taken = reminders.filter(r => r.status === 'taken').length;
    const adherence = {
      totalDoses,
      taken,
      percentage: totalDoses > 0 ? Math.round((taken / totalDoses) * 100) : 0,
    };

    const allergies = user?.allergies ? JSON.parse(user.allergies) : [];

    return jsonOk({
      patientName: sessionUser.name,
      visitDate: new Date().toISOString(),
      medications: medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      adherence,
      symptoms: [],
      questions: [],
      allergies,
      conditions: conditions.map(c => c.name),
    });
  } catch (error) {
    logger.phiSafeError(error);
    return jsonError('Failed to load consultation data', 500);
  }
}

export async function POST(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return jsonError('Invalid JSON', 400);

    const { notes, questions } = body as { notes?: string; questions?: string[] };

    // In production, this would call an AI service to generate a report
    // For now, return the input data formatted as a report
    const report = {
      patientName: user.name,
      generatedAt: new Date().toISOString(),
      notes: notes || '',
      questions: questions || [],
      summary: 'Consultation preparation report generated based on your health data.',
    };

    return jsonOk(report);
  } catch (error) {
    logger.phiSafeError(error);
    return jsonError('Failed to generate report', 500);
  }
}
