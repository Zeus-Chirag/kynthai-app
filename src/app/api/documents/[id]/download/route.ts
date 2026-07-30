// src/app/api/documents/[id]/download/route.ts
// Download medical document with decryption

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { decryptFile } from '@/lib/encryption';
import { downloadMedicalDocument, getSignedDocumentUrl } from '@/lib/storage';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get document from database
    const document = await db.medicalDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = await checkDocumentAccess(session.user.id, (session.user as any).role, document);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Option 1: Return signed URL for direct download (recommended for large files)
    const { url, error: urlError } = await getSignedDocumentUrl(document.storagePath, 3600);
    if (!urlError && url) {
      // Update access tracking
      await db.medicalDocument.update({
        where: { id },
        data: {
          accessedAt: new Date(),
          downloadedAt: new Date(),
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'document.download',
          category: 'access',
          resourceType: 'MedicalDocument',
          resourceId: id,
          httpMethod: 'GET',
          httpPath: `/api/documents/${id}/download`,
          statusCode: 200,
          outcome: 'success',
          details: `Downloaded ${document.type}: ${document.title}`,
        },
      });

      return NextResponse.redirect(url);
    }

    // Option 2: Stream decrypted file (fallback)
    const { data: encryptedData, error: downloadError } = await downloadMedicalDocument(document.storagePath);
    if (downloadError || !encryptedData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Parse encryption metadata from base64 string
    // Format: iv:salt:authTag (all base64)
    const encryptionKey = document.encryptionKey || '';
    const [ivB64, saltB64, tagB64] = encryptionKey.split(':');
    const iv = Buffer.from(ivB64!, 'base64');
    const salt = Buffer.from(saltB64!, 'base64');
    const authTag = Buffer.from(tagB64!, 'base64');

    // Decrypt file
    const decryptedData = decryptFile(encryptedData, iv, salt, authTag);

    // Update access tracking
    await db.medicalDocument.update({
      where: { id },
      data: {
        accessedAt: new Date(),
        downloadedAt: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'document.download',
        category: 'access',
        resourceType: 'MedicalDocument',
        resourceId: id,
        httpMethod: 'GET',
        httpPath: `/api/documents/${id}/download`,
        statusCode: 200,
        outcome: 'success',
        details: `Downloaded ${document.type}: ${document.title}`,
      },
    });

    // Return decrypted file
    return new NextResponse(new Uint8Array(decryptedData), {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.title}.${document.storagePath.split('.').pop()}"`,
        'Content-Length': decryptedData.length.toString(),
      },
    });
  } catch (error) {
    logger.phiSafeError(error, 'documents.download');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkDocumentAccess(
  userId: string,
  userRole: string,
  document: {
    id: string;
    userId: string;
    uploadedById: string;
    familyId: string | null;
    visibility: string;
    sharedWith: string[];
  }
): Promise<boolean> {
  // Owner
  if (document.userId === userId) return true;
  
  // Uploader
  if (document.uploadedById === userId) return true;

  // Doctor access
  if (userRole === 'doctor' && ['CLINICAL', 'ADMINISTRATIVE'].includes(document.visibility)) {
    return true;
  }

  // Family access
  if (document.familyId && document.visibility === 'FAMILY') {
    const membership = await db.familyMember.findFirst({
      where: { familyId: document.familyId, userId, inviteStatus: 'accepted' },
    });
    if (membership) return true;
  }

  // Explicit sharing
  if (document.sharedWith.includes(userId)) return true;

  // Emergency access
  if (document.visibility === 'EMERGENCY' && userRole === 'doctor') {
    logger.warn(`EMERGENCY ACCESS: ${userId} accessed document ${document.id}`);
    return true;
  }

  return false;
}