'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen, X, Loader2, CheckCircle, AlertCircle, RotateCw } from 'lucide-react';

async function pollStatus(sourceId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(`/api/ingest/status/${sourceId}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'ready') return { success: true };
      if (data.status === 'error') return { success: false, error: data.error_message || 'Processing failed' };
    } catch {
      // Network hiccup, keep polling
    }
  }
  return { success: false, error: 'Processing timed out' };
}

export default function UploadPanel({ onClose, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const updateFile = (name, updates) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, ...updates } : f)));
  };

  const retryProcess = async (fileEntry) => {
    updateFile(fileEntry.name, { status: 'processing', result: 'Retrying...' });
    try {
      const res = await fetch('/api/ingest/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: fileEntry.sourceId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ready') {
          updateFile(fileEntry.name, { status: 'done', result: `${data.chunks_count} chunks` });
          onUploadComplete();
          return;
        }
      }
    } catch {
      // Retry endpoint itself may timeout, fall through to polling
    }
    // Poll for status
    const result = await pollStatus(fileEntry.sourceId);
    if (result.success) {
      updateFile(fileEntry.name, { status: 'done', result: 'Processed' });
    } else {
      updateFile(fileEntry.name, { status: 'error', result: result.error });
    }
    onUploadComplete();
  };

  const handleFiles = async (fileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      file: f,
      name: f.name,
      status: 'pending',
      result: null,
      sourceId: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    for (const fileEntry of newFiles) {
      updateFile(fileEntry.name, { status: 'uploading', result: 'Uploading...' });

      try {
        // Step 1: Upload file (fast — just stores file and creates source record)
        const formData = new FormData();
        formData.append('file', fileEntry.file);

        const res = await fetch('/api/ingest', { method: 'POST', body: formData });

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Server error ${res.status}: Upload failed`);
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        fileEntry.sourceId = data.source_id;
        updateFile(fileEntry.name, {
          status: 'processing',
          result: 'Processing...',
          sourceId: data.source_id,
        });

        // Step 2: Poll for processing completion (background processing via after())
        const result = await pollStatus(data.source_id);
        if (result.success) {
          updateFile(fileEntry.name, { status: 'done', result: 'Ingested' });
        } else {
          updateFile(fileEntry.name, {
            status: 'error',
            result: result.error,
            sourceId: data.source_id,
          });
        }
      } catch (err) {
        updateFile(fileEntry.name, { status: 'error', result: err.message });
      }
    }

    onUploadComplete();
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-neutral-900 rounded-2xl p-8 w-[480px] max-w-[90vw] shadow-2xl shadow-black/50 animate-slide-up"
        style={{ border: '1px solid #262626' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
            Upload Documents
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-5">
          Supported formats: PDF, Excel (.xlsx), Email (.eml), Images (.png, .jpg)
        </p>

        {/* Drop zone */}
        <div
          className={cn(
            'rounded-xl p-10 text-center cursor-pointer transition-all',
            dragging ? 'bg-blue-500/10' : 'hover:bg-neutral-800/50'
          )}
          style={{
            border: dragging ? '2px dashed #3b82f6' : '2px dashed #404040',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <div className="text-sm text-neutral-300 font-medium">Drop files here or click to browse</div>
          <div className="text-xs text-neutral-600 mt-1">PDF, XLSX, XLS, EML, PNG, JPG up to 10MB</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.eml,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800/60 rounded-lg">
                <span className="flex-1 text-sm font-medium text-neutral-300 truncate">{f.name}</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {f.status === 'pending' && <span className="text-neutral-500">Waiting...</span>}
                  {f.status === 'uploading' && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </span>
                  )}
                  {f.status === 'processing' && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing...
                    </span>
                  )}
                  {f.status === 'done' && (
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {f.result}
                    </span>
                  )}
                  {f.status === 'error' && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="max-w-[140px] truncate">{f.result}</span>
                      {f.sourceId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryProcess(f);
                          }}
                          className="ml-1 p-0.5 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
                          title="Retry processing"
                          style={{ border: 'none', background: 'none' }}
                        >
                          <RotateCw className="w-3 h-3 text-neutral-400 hover:text-white" />
                        </button>
                      )}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Done button */}
        {allDone && (
          <button
            onClick={onClose}
            className="w-full mt-5 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors cursor-pointer"
            style={{ border: 'none' }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
