'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  Search,
  FileText,
  Table2,
  File,
  CheckSquare,
  Square,
  CheckCircle,
} from 'lucide-react';

const MIME_LABELS = {
  'application/pdf': { label: 'PDF', color: 'text-red-400' },
  'application/vnd.google-apps.document': { label: 'Doc', color: 'text-blue-400' },
  'application/vnd.google-apps.spreadsheet': { label: 'Sheet', color: 'text-green-400' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'Excel', color: 'text-green-400' },
  'application/vnd.ms-excel': { label: 'Excel', color: 'text-green-400' },
};

function FileIcon({ mimeType }) {
  if (mimeType === 'application/pdf') return <File className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <Table2 className="w-4 h-4 text-green-400 flex-shrink-0" />;
  return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DriveFilePicker({ onClose, onUpload, folderId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ maxFiles: '100' });
    if (folderId) params.set('folderId', folderId);
    fetch(`/api/fetch/drive?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setFiles(d.files || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [folderId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  const unsynced = filtered.filter((f) => !f.alreadySynced);

  function toggleFile(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const unsyncedIds = unsynced.map((f) => f.id);
    const allSelected = unsyncedIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        unsyncedIds.forEach((id) => next.delete(id));
      } else {
        unsyncedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleUpload() {
    if (selected.size === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/fetch/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadResult({ ok: true, synced: data.synced, skipped: data.skipped, errors: data.errors });
      // Mark uploaded files as synced in local state
      setFiles((prev) =>
        prev.map((f) => (selected.has(f.id) ? { ...f, alreadySynced: true } : f))
      );
      setSelected(new Set());
      onUpload();
    } catch (err) {
      setUploadResult({ ok: false, error: err.message });
    } finally {
      setUploading(false);
    }
  }

  const selectedCount = selected.size;
  const unsyncedIds = new Set(unsynced.map((f) => f.id));
  const allUnsyncedSelected = unsynced.length > 0 && unsynced.every((f) => selected.has(f.id));

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-neutral-900 rounded-2xl w-[580px] max-w-[95vw] max-h-[80vh] flex flex-col shadow-2xl shadow-black/60"
        style={{ border: '1px solid #262626' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #262626' }}>
          <div>
            <h3 className="text-base font-semibold text-white">Browse Google Drive</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Select files to import into your knowledge base</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 outline-none"
              style={{ border: '1px solid #404040' }}
              onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.target.style.borderColor = '#404040')}
            />
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-400 px-3 py-8 justify-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-12">
              {search ? 'No files match your search.' : 'No supported files found in Drive.'}
            </p>
          ) : (
            <>
              {/* Select-all row */}
              {unsynced.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer mb-1"
                  style={{ border: 'none', background: 'none' }}
                >
                  {allUnsyncedSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  {allUnsyncedSelected ? 'Deselect all' : `Select all (${unsynced.length} not yet imported)`}
                </button>
              )}

              {filtered.map((file) => {
                const isSelected = selected.has(file.id);
                const isSynced = file.alreadySynced;
                const typeInfo = MIME_LABELS[file.mimeType] || { label: 'File', color: 'text-neutral-400' };

                return (
                  <button
                    key={file.id}
                    onClick={() => !isSynced && toggleFile(file.id)}
                    disabled={isSynced}
                    className={[
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors mb-0.5',
                      isSynced
                        ? 'opacity-50 cursor-default'
                        : isSelected
                        ? 'bg-blue-500/15 cursor-pointer'
                        : 'hover:bg-neutral-800 cursor-pointer',
                    ].join(' ')}
                    style={{ border: 'none', background: isSelected && !isSynced ? 'rgba(59,130,246,0.12)' : undefined }}
                  >
                    {/* Checkbox */}
                    <span className="flex-shrink-0">
                      {isSynced ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-600" />
                      )}
                    </span>

                    <FileIcon mimeType={file.mimeType} />

                    <span className="flex-1 truncate text-sm text-neutral-200 min-w-0">{file.name}</span>

                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${typeInfo.color} bg-neutral-800 flex-shrink-0`}>
                      {typeInfo.label}
                    </span>

                    <span className="text-[11px] text-neutral-600 flex-shrink-0 hidden sm:block">
                      {isSynced ? 'Imported' : formatDate(file.modifiedTime)}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid #262626' }}
        >
          <div className="text-xs text-neutral-500">
            {!loading && !error && (
              <>
                {files.length} file{files.length !== 1 ? 's' : ''} found
                {files.filter((f) => f.alreadySynced).length > 0 && (
                  <span className="text-green-600 ml-1">
                    · {files.filter((f) => f.alreadySynced).length} already imported
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {uploadResult && (
              <span className={`text-xs ${uploadResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {uploadResult.ok
                  ? `${uploadResult.synced} imported · ${uploadResult.skipped} skipped`
                  : uploadResult.error}
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              style={{ border: '1px solid #404040', background: 'none' }}
            >
              Close
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedCount === 0 || uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: 'none' }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing…
                </>
              ) : (
                `Import${selectedCount > 0 ? ` ${selectedCount} file${selectedCount !== 1 ? 's' : ''}` : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
