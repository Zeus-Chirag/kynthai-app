// src/app/api/documents/list/route.ts
// List user's medical documents

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.config';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const familyId = searchParams.get('familyId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (familyId) {
      // Verify family membership
      const membership = await db.familyMember.findFirst({
        where: { familyId, userId: session.user.id, inviteStatus: 'accepted' },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Not a family member' }, { status: 403 });
      }
      where.familyId = familyId;
    }

    const [documents, total] = await Promise.all([
      db.medicalDocument.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          category: true,
          title: true,
          description: true,
          mimeType: true,
          fileSize: true,
          visibility: true,
          uploadedAt: true,
          accessedAt: true,
          downloadedAt: true,
        },
      }),
      db.medicalDocument.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}