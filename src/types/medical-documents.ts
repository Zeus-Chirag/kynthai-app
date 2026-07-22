// src/types/medical-documents.ts
// Medical document types for the Kyntha platform

export type DocumentType = 
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'CERTIFICATE'
  | 'CONSULTATION_NOTE'
  | 'INSURANCE_CARD'
  | 'INSURANCE_CLAIM'
  | 'DISCHARGE_SUMMARY'
  | 'IMAGING_REPORT'
  | 'VACCINATION_RECORD'
  | 'ALLERGY_RECORD'
  | 'OTHER';

export type DocumentCategory = 
  | 'CLINICAL'
  | 'ADMINISTRATIVE'
  | 'LEGAL'
  | 'FINANCIAL';

export type DocumentVisibility = 
  | 'PRIVATE'
  | 'DOCTOR'
  | 'FAMILY'
  | 'EMERGENCY';

export interface MedicalDocument {
  id: string;
  userId: string;
  uploadedById: string;
  familyId?: string | null;
  type: DocumentType;
  category: DocumentCategory;
  title: string;
  description?: string | null;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  bucket: string;
  encrypted: boolean;
  encryptionKey?: string | null;
  visibility: DocumentVisibility;
  sharedWith: string[];
  uploadedAt: Date | string;
  accessedAt?: Date | string | null;
  downloadedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DocumentUploadRequest {
  file: File;
  type: DocumentType;
  category?: DocumentCategory;
  title: string;
  description?: string;
  visibility?: DocumentVisibility;
  familyId?: string;
  sharedWith?: string[];
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: {
    id: string;
    title: string;
    type: DocumentType;
    fileSize: number;
    uploadedAt: Date;
  };
  error?: string;
}

export interface DocumentListResponse {
  documents: MedicalDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DocumentListParams {
  page?: number;
  limit?: number;
  type?: DocumentType;
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  familyId?: string;
  search?: string;
  sortBy?: 'uploadedAt' | 'title' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentDownloadResponse {
  url: string;
  filename: string;
  mimeType: string;
  encryptionKey: string;
}

export interface DocumentShareRequest {
  documentId: string;
  sharedWith: string[];
  visibility?: DocumentVisibility;
}

export interface DocumentShareResponse {
  success: boolean;
  sharedWith: string[];
  error?: string;
}

export interface DocumentDeleteResponse {
  success: boolean;
  error?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PRESCRIPTION: 'Prescription',
  LAB_REPORT: 'Lab Report',
  CERTIFICATE: 'Certificate',
  CONSULTATION_NOTE: 'Consultation Note',
  INSURANCE_CARD: 'Insurance Card',
  INSURANCE_CLAIM: 'Insurance Claim',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  IMAGING_REPORT: 'Imaging Report',
  VACCINATION_RECORD: 'Vaccination Record',
  ALLERGY_RECORD: 'Allergy Record',
  OTHER: 'Other',
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CLINICAL: 'Clinical',
  ADMINISTRATIVE: 'Administrative',
  LEGAL: 'Legal',
  FINANCIAL: 'Financial',
};

export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  PRIVATE: 'Private',
  DOCTOR: 'Doctor',
  FAMILY: 'Family',
  EMERGENCY: 'Emergency',
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/dicom',
  'application/zip',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}