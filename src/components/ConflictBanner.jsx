'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConflictBanner({ detected, details }) {
  if (detected) {
    return (
      <div
        className="mt-3 p-3 rounded-lg bg-amber-500/10 animate-fade-in"
        style={{ border: '1px solid rgba(245, 158, 11, 0.2)' }}
      >
        <div className="flex items-center gap-2 font-semibold text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflict Detected
        </div>
        <div className="mt-1 text-[11px] text-amber-300/80 leading-relaxed">
          {details}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-3 p-3 rounded-lg bg-green-500/10 animate-fade-in"
      style={{ border: '1px solid rgba(34, 197, 94, 0.2)' }}
    >
      <div className="flex items-center gap-2 font-semibold text-green-400 text-xs">
        <CheckCircle className="w-3.5 h-3.5" />
        Sources Consistent
      </div>
      <div className="mt-1 text-[11px] text-green-300/80 leading-relaxed">
        No conflicting information found across sources.
      </div>
    </div>
  );
}
