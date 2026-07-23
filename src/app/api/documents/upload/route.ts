// src/app/api/documents/upload/route.ts
// Upload medical document with encryption

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { encryptFile, generateFileId, sanitizeFilename } from '@/lib/encryption';
import { uploadMedicalDocument } from '@/lib/storage';
import { DocumentType, DocumentCategory, DocumentVisibility } from '@prisma/client';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/dicom',
  'application/zip',
  'text/plain',
];

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as DocumentType;
    const category = (formData.get('category') as DocumentCategory) || 'CLINICAL';
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const visibility = (formData.get('visibility') as DocumentVisibility) || 'PRIVATE';
    const familyId = formData.get('familyId') as string || null;
    const sharedWith = formData.get('sharedWith') ? JSON.parse(formData.get('sharedWith') as string) : [];

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }
    if (!type || !Object.values(DocumentType).includes(type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Verify family membership if familyId provided
    if (familyId) {
      const membership = await db.familyMember.findFirst({
        where: { familyId, userId: user.id, inviteStatus: 'accepted' },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Encrypt file
    const { encryptedData, iv, salt, authTag } = encryptFile(fileBuffer);

    // Generate file ID and path
    const fileId = generateFileId();
    const fileExt = sanitizeFilename(file.name.split('.').pop() || 'bin');

    // Upload to Supabase Storage
    const { path: storagePath, error: uploadError } = await uploadMedicalDocument(
      user.id,
      type.toLowerCase(),
      fileId,
      fileExt,
      encryptedData,
      {
        originalName: file.name,
        mimeType: file.type,
        uploadedBy: user.id,
      }
    );

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed: ' + uploadError }, { status: 500 });
    }

    // Store encryption metadata (iv:salt:authTag as base64)
    const encryptionKey = `${iv.toString('base64')}:${salt.toString('base64')}:${authTag.toString('base64')}`;

    // Create database record
    const document = await db.medicalDocument.create({
      data: {
        userId: user.id,
        uploadedById: user.id,
        familyId,
        type,
        category,
        title: title || file.name,
        description,
        mimeType: file.type,
        fileSize: file.size,
        storagePath,
        bucket: 'medical-documents',
        encrypted: true,
        encryptionKey,
        visibility,
        sharedWith,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'document.upload',
        category: 'modification',
        resourceType: 'MedicalDocument',
        resourceId: document.id,
        httpMethod: 'POST',
        httpPath: '/api/documents/upload',
        statusCode: 200,
        outcome: 'success',
        details: `Uploaded ${type}: ${title || file.name}`,
        metadata: JSON.stringify({ fileSize: file.size, mimeType: file.type }),
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        type: document.type,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.phiSafeError(error, 'documents.upload');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}