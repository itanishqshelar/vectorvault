'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Mail, FolderOpen, Loader2, CheckCircle, AlertCircle, Unplug } from 'lucide-react';

export default function SyncPanel({ onClose, onSyncComplete }) {
  const [connected, setConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Gmail state
  const [gmailQuery, setGmailQuery] = useState('');
  const [gmailMax, setGmailMax] = useState(20);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailResult, setGmailResult] = useState(null);

  // Drive state
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveMax, setDriveMax] = useState(20);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveResult, setDriveResult] = useState(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false))
      .finally(() => setCheckingStatus(false));
  }, []);

  async function handleDisconnect() {
    await fetch('/api/auth/status', { method: 'DELETE' });
    setConnected(false);
    setGmailResult(null);
    setDriveResult(null);
  }

  async function handleGmailSync() {
    setGmailLoading(true);
    setGmailResult(null);
    try {
      const res = await fetch('/api/fetch/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxMessages: gmailMax, query: gmailQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gmail sync failed');
      setGmailResult({ ok: true, synced: data.synced, skipped: data.skipped });
      if (data.synced > 0) onSyncComplete();
    } catch (err) {
      setGmailResult({ ok: false, error: err.message });
    } finally {
      setGmailLoading(false);
    }
  }

  async function handleDriveSync() {
    setDriveLoading(true);
    setDriveResult(null);
    try {
      const res = await fetch('/api/fetch/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxFiles: driveMax, folderId: driveFolderId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Drive sync failed');
      setDriveResult({ ok: true, synced: data.synced, skipped: data.skipped });
      if (data.synced > 0) onSyncComplete();
    } catch (err) {
      setDriveResult({ ok: false, error: err.message });
    } finally {
      setDriveLoading(false);
    }
  }

  const inputStyle = {
    border: '1px solid #404040',
    outline: 'none',
  };

  const inputFocusStyle = '1px solid #3b82f6';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-neutral-900 rounded-2xl p-8 w-[520px] max-w-[90vw] shadow-2xl shadow-black/50 animate-slide-up"
        style={{ border: '1px solid #262626' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
            Sync Google
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {checkingStatus ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : !connected ? (
          /* Not connected */
          <div className="mt-6 flex flex-col items-center text-center gap-5">
            <div
              className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center"
              style={{ border: '1px solid #404040' }}
            >
              {/* Google-colored G icon */}
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-300 font-medium">Connect your Google account</p>
              <p className="text-xs text-neutral-500 mt-1">
                Sync Gmail and Drive into your knowledge base
              </p>
            </div>
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(to right, #2563eb, #3b82f6)',
                boxShadow: '0 10px 15px -3px rgba(37,99,235,0.25)',
                border: 'none',
              }}
            >
              Connect Google Account
            </a>
            <p className="text-[11px] text-neutral-600">
              Read-only access. No data sent to third parties.
            </p>
          </div>
        ) : (
          /* Connected */
          <div className="mt-4 space-y-6">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                Connected to Google
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                style={{ border: 'none', background: 'none' }}
              >
                <Unplug className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>

            {/* Gmail section */}
            <div
              className="bg-neutral-800/50 rounded-xl p-4 space-y-3"
              style={{ border: '1px solid rgba(64,64,64,0.5)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-orange-400/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-white">Gmail</span>
              </div>
              <input
                type="text"
                placeholder="from:boss@company.com or label:work"
                value={gmailQuery}
                onChange={(e) => setGmailQuery(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 rounded-lg text-sm text-neutral-200 placeholder-neutral-600"
                style={inputStyle}
                onFocus={(e) => e.target.style.border = inputFocusStyle}
                onBlur={(e) => e.target.style.border = inputStyle.border}
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-neutral-500 whitespace-nowrap">Max emails</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={gmailMax}
                    onChange={(e) => setGmailMax(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-neutral-900 rounded-lg text-sm text-neutral-200"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.border = inputFocusStyle}
                    onBlur={(e) => e.target.style.border = inputStyle.border}
                  />
                </div>
                <button
                  onClick={handleGmailSync}
                  disabled={gmailLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-colors cursor-pointer disabled:opacity-50"
                  style={{ border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  {gmailLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Gmail'
                  )}
                </button>
              </div>
              {gmailResult && (
                <SyncResult result={gmailResult} />
              )}
            </div>

            {/* Drive section */}
            <div
              className="bg-neutral-800/50 rounded-xl p-4 space-y-3"
              style={{ border: '1px solid rgba(64,64,64,0.5)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-400/10 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-white">Google Drive</span>
              </div>
              <input
                type="text"
                placeholder="Leave blank to search all of Drive"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 rounded-lg text-sm text-neutral-200 placeholder-neutral-600"
                style={inputStyle}
                onFocus={(e) => e.target.style.border = inputFocusStyle}
                onBlur={(e) => e.target.style.border = inputStyle.border}
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-neutral-500 whitespace-nowrap">Max files</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={driveMax}
                    onChange={(e) => setDriveMax(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-neutral-900 rounded-lg text-sm text-neutral-200"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.border = inputFocusStyle}
                    onBlur={(e) => e.target.style.border = inputStyle.border}
                  />
                </div>
                <button
                  onClick={handleDriveSync}
                  disabled={driveLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
                  style={{ border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  {driveLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Drive'
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-600">
                Supports: PDF, Google Docs, Google Sheets, Excel
              </p>
              {driveResult && (
                <SyncResult result={driveResult} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncResult({ result }) {
  if (!result.ok) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        {result.error}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-green-400">
      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {result.synced} imported &middot; {result.skipped} skipped
    </div>
  );
}
