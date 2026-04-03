'use client';

import { useState, useRef } from 'react';

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
    <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upload-panel">
        <div className="upload-title">Upload Documents</div>
        <div className="upload-subtitle">
          Supported formats: PDF, Excel (.xlsx), Email (.eml)
        </div>

        <div
          className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-dropzone-icon">{'\u{1F4C1}'}</div>
          <div className="upload-dropzone-text">Drop files here or click to browse</div>
          <div className="upload-dropzone-hint">PDF, XLSX, XLS, EML up to 10MB</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.eml"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="upload-progress">
            {files.map((f, i) => (
              <div key={i} className="upload-file-item">
                <span className="upload-file-name">{f.name}</span>
                <span className={`upload-file-status ${f.status}`}>
                  {f.status === 'pending' && 'Waiting...'}
                  {f.status === 'processing' && 'Processing...'}
                  {f.status === 'done' && f.result}
                  {f.status === 'error' && f.result}
                </span>
              </div>
            ))}
          </div>
        )}

        {allDone && (
          <button className="btn btn-secondary upload-close" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}
