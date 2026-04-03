'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, Sheet, Mail, FolderOpen, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
  pdf: { icon: FileText, cls: 'text-red-400 bg-red-400/10' },
  excel: { icon: Sheet, cls: 'text-green-400 bg-green-400/10' },
  email: { icon: Mail, cls: 'text-blue-400 bg-blue-400/10' },
  gmail: { icon: Mail, cls: 'text-orange-400 bg-orange-400/10' },
  drive: { icon: FolderOpen, cls: 'text-blue-400 bg-blue-400/10' },
};

function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-blue-500/30 text-blue-200 rounded px-0.5">{part}</mark>
    ) : part
  );
}

function excerpt(content, maxLen = 200) {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen).trimEnd() + '…';
}

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setActiveIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Keyboard shortcut Ctrl/Cmd+K to open
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) onClose('open');
      }
      if (e.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(18,18,20,0.98)',
          border: '1px solid rgba(64,64,64,0.6)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          maxHeight: '70vh',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #262626' }}>
          {loading
            ? <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 animate-spin" />
            : <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents semantically…"
            className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              style={{ border: 'none', background: 'none', padding: 0 }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] text-neutral-500 font-mono"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {!query.trim() && (
            <div className="px-6 py-10 text-center text-neutral-500 text-sm">
              Type to search across all your documents using semantic understanding
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="px-6 py-10 text-center text-neutral-500 text-sm">
              No matching content found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              <div className="px-5 pb-1 text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map((r, i) => {
                const typeInfo = TYPE_ICONS[r.source_type] || TYPE_ICONS.pdf;
                const Icon = typeInfo.icon;
                const pct = Math.round(r.similarity * 100);
                return (
                  <div
                    key={`${r.source_id}-${r.id}`}
                    className={cn(
                      'mx-2 px-4 py-3.5 rounded-xl mb-1 cursor-default transition-colors',
                      i === activeIndex
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'hover:bg-neutral-800/50 border border-transparent'
                    )}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {/* File header */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', typeInfo.cls)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium text-neutral-200 truncate flex-1">
                        {r.filename}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: pct >= 70 ? 'rgba(59,130,246,0.15)' : 'rgba(100,100,100,0.15)',
                          color: pct >= 70 ? '#60a5fa' : '#6b7280',
                          border: `1px solid ${pct >= 70 ? 'rgba(59,130,246,0.2)' : 'rgba(100,100,100,0.2)'}`,
                        }}
                      >
                        {pct}% match
                      </span>
                    </div>
                    {/* Content excerpt */}
                    <p className="text-sm text-neutral-400 leading-relaxed pl-8">
                      {highlightMatch(excerpt(r.content), query)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-[11px] text-neutral-600"
          style={{ borderTop: '1px solid #262626' }}
        >
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto">Powered by vector embeddings</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
