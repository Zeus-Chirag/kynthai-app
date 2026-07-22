'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  FileImage, 
  FileType, 
  Lock, 
  Users, 
  AlertTriangle,
  Download,
  Share2,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  Loader2,
  Filter,
  X,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { MedicalDocument, DocumentType, DocumentCategory, DocumentVisibility } from '@/types/medical-documents';

interface DocumentListProps {
  documents: MedicalDocument[];
  loading?: boolean;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  showFilters?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  PRESCRIPTION: <FileText className="h-5 w-5 text-emerald-500" />,
  LAB_REPORT: <FileText className="h-5 w-5 text-blue-500" />,
  CERTIFICATE: <FileType className="h-5 w-5 text-amber-500" />,
  CONSULTATION_NOTE: <FileText className="h-5 w-5 text-violet-500" />,
  INSURANCE_CARD: <FileType className="h-5 w-5 text-orange-500" />,
  INSURANCE_CLAIM: <FileText className="h-5 w-5 text-red-500" />,
  DISCHARGE_SUMMARY: <FileText className="h-5 w-5 text-indigo-500" />,
  IMAGING_REPORT: <FileImage className="h-5 w-5 text-pink-500" />,
  VACCINATION_RECORD: <FileType className="h-5 w-5 text-green-500" />,
  ALLERGY_RECORD: <FileType className="h-5 w-5 text-rose-500" />,
  OTHER: <FileType className="h-5 w-5 text-gray-500" />,
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  CLINICAL: 'bg-emerald-100 text-emerald-700',
  ADMINISTRATIVE: 'bg-blue-100 text-blue-700',
  LEGAL: 'bg-amber-100 text-amber-700',
  FINANCIAL: 'bg-violet-100 text-violet-700',
};

const VISIBILITY_ICONS: Record<DocumentVisibility, React.ReactNode> = {
  PRIVATE: <Lock className="h-4 w-4" />,
  DOCTOR: <Users className="h-4 w-4" />,
  FAMILY: <Users className="h-4 w-4" />,
  EMERGENCY: <AlertTriangle className="h-4 w-4" />,
};

const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  PRIVATE: 'Private',
  DOCTOR: 'Doctor',
  FAMILY: 'Family',
  EMERGENCY: 'Emergency',
};

const VISIBILITY_COLORS: Record<DocumentVisibility, string> = {
  PRIVATE: 'bg-gray-100 text-gray-700',
  DOCTOR: 'bg-blue-100 text-blue-700',
  FAMILY: 'bg-green-100 text-green-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentList({
  documents,
  loading = false,
  onDownload,
  onShare,
  onDelete,
  onView,
  showFilters = true,
  className = '',
}: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);
  const [showDocMenu, setShowDocMenu] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<DocumentType | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [filterVisibility, setFilterVisibility] = useState<DocumentVisibility | 'ALL'>('ALL');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filteredDocs = documents.filter(doc => {
    if (filterType !== 'ALL' && doc.type !== filterType) return false;
    if (filterCategory !== 'ALL' && doc.category !== filterCategory) return false;
    if (filterVisibility !== 'ALL' && doc.visibility !== filterVisibility) return false;
    return true;
  });

  const hasActiveFilters = filterType !== 'ALL' || filterCategory !== 'ALL' || filterVisibility !== 'ALL';

  const handleDocClick = (doc: MedicalDocument) => {
    if (onView) {
      onView(doc.id);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setShowDocMenu(showDocMenu === docId ? null : docId);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowDocMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredDocs.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {documents.length === 0 ? 'No documents yet' : 'No documents match your filters'}
        </h3>
        <p className="text-gray-500">
          {documents.length === 0 
            ? 'Upload your first medical document to get started'
            : 'Try adjusting your filters'}
        </p>
        {hasActiveFilters && (
          <button 
            onClick={() => {
              setFilterType('ALL');
              setFilterCategory('ALL');
              setFilterVisibility('ALL');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setFilterCategory('ALL');
                  setFilterVisibility('ALL');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as DocumentType | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="ALL">All Types</option>
                {Object.keys(TYPE_ICONS).map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="ALL">All Categories</option>
                <option value="CLINICAL">Clinical</option>
                <option value="ADMINISTRATIVE">Administrative</option>
                <option value="LEGAL">Legal</option>
                <option value="FINANCIAL">Financial</option>
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as DocumentVisibility | 'ALL')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="ALL">All Visibilities</option>
                <option value="PRIVATE">Private</option>
                <option value="DOCTOR">Doctor</option>
                <option value="FAMILY">Family</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocs.map((doc, index) => {
          return (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={index}
              onClick={() => handleDocClick(doc)}
              onDownload={() => onDownload?.(doc.id)}
              onShare={() => onShare?.(doc.id)}
              onDelete={() => onDelete?.(doc.id)}
              onMenuClick={(e) => handleMenuClick(e, doc.id)}
              showMenu={showDocMenu === doc.id}
              onCloseMenu={() => setShowDocMenu(null)}
            />
          );
        })}

        {filteredDocs.length !== documents.length && !hasActiveFilters && (
          <div className="text-center text-sm text-gray-500 py-4">
            Showing {filteredDocs.length} of {documents.length} documents
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentCardProps {
  doc: MedicalDocument;
  index: number;
  onClick: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onMenuClick: (e: React.MouseEvent) => void;
  showMenu: boolean;
  onCloseMenu: () => void;
}

function DocumentCard({ 
  doc, 
  index, 
  onClick, 
  onDownload, 
  onShare, 
  onDelete, 
  onMenuClick, 
  showMenu, 
  onCloseMenu 
}: DocumentCardProps) {
  return (
    <div 
      className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Type Icon */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-lg bg-gray-50 flex items-center justify-center">
              {TYPE_ICONS[doc.type as keyof typeof TYPE_ICONS] || TYPE_ICONS.OTHER}
            </div>
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                <p className="text-sm text-gray-500 mt-1 truncate">{doc.description || 'No description'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[doc.category as DocumentCategory]}`}>
                    {doc.category}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${VISIBILITY_COLORS[doc.visibility as DocumentVisibility]}`}>
                    <span className="flex items-center gap-1">
                      {VISIBILITY_ICONS[doc.visibility as DocumentVisibility]}
                      {VISIBILITY_LABELS[doc.visibility as DocumentVisibility]}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(doc.uploadedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {formatFileSize(doc.fileSize)}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Button */}
          <div className="flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="fixed z-50 mt-2 right-0 w-48 bg-white rounded-lg border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload(); onCloseMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onShare(); onCloseMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); onCloseMenu(); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview hint */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Click to view document</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            View
          </span>
        </div>
      </div>
    </div>
  );
}

export default DocumentList;