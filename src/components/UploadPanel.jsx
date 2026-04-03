'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderOpen, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadPanel({ onClose, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      file: f,
      name: f.name,
      status: 'pending',
      result: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    for (const fileEntry of newFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.name === fileEntry.name ? { ...f, status: 'processing' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', fileEntry.file);

        const res = await fetch('/api/ingest', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Upload failed');

        setFiles((prev) =>
          prev.map((f) =>
            f.name === fileEntry.name
              ? { ...f, status: 'done', result: `${data.chunks_count} chunks` }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === fileEntry.name ? { ...f, status: 'error', result: err.message } : f
          )
        );
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-[480px] max-w-[90vw] shadow-2xl shadow-black/50 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
            Upload Documents
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-500 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-neutral-500 mb-5">
          Supported formats: PDF, Excel (.xlsx), Email (.eml)
        </p>

        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
            dragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <div className="text-sm text-neutral-300 font-medium">
            Drop files here or click to browse
          </div>
          <div className="text-xs text-neutral-600 mt-1">
            PDF, XLSX, XLS, EML up to 10MB
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.eml"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800/60 rounded-lg"
              >
                <span className="flex-1 text-sm font-medium text-neutral-300 truncate">
                  {f.name}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {f.status === 'pending' && (
                    <span className="text-neutral-500">Waiting...</span>
                  )}
                  {f.status === 'processing' && (
                    <span className="text-indigo-400 flex items-center gap-1">
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
                      {f.result}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Done button */}
        {allDone && (
          <Button
            onClick={onClose}
            className="w-full mt-5 bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
