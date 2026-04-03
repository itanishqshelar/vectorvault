'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';

export default function DocumentViewer({ source, onClose }) {
  const [docContent, setDocContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!source?.id) {
      setLoading(false);
      setError("No document ID provided.");
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/document?id=${source.id}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.error) throw new Error(data.error);
        
        // combine chunks into one text string
        const fullText = (data.chunks || []).map(c => c.content).join('\n\n');
        setDocContent(fullText);
      })
      .catch(err => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [source]);

  useEffect(() => {
    if (!loading && docContent && source?.snippet && contentRef.current) {
      // Find the highlight element and scroll to it
      setTimeout(() => {
        const highlightEl = contentRef.current.querySelector('mark');
        if (highlightEl) {
          highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [loading, docContent, source]);

  if (!source) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-400 p-6 text-center">
          <p>{error}</p>
        </div>
      );
    }

    if (!docContent) {
       return (
        <div className="flex-1 flex items-center justify-center text-neutral-500 p-6">
          <p>No content available.</p>
        </div>
      );
    }

    // Highlight the snippet text within the full doc
    let highlightedHTML = docContent;
    if (source.snippet) {
      // Fallback: snippet from LLM might not exactly match (spaces, newlines).
      // Let's do a loose replace by removing exact string, but if fails, we do a fallback search.
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const snippetEscaped = escapeRegExp(source.snippet);
      // Try exact
      let snippetRe = new RegExp(snippetEscaped, 'i');
      let match = docContent.match(snippetRe);
      
      if (!match) {
        // loose match: just first 30 chars
        const looseSnippet = source.snippet.substring(0, 30);
        snippetRe = new RegExp(escapeRegExp(looseSnippet), 'i');
        match = docContent.match(snippetRe);
      }

      if (match) {
        highlightedHTML = docContent.replace(
          snippetRe,
          (m) => `<mark class="bg-blue-500/40 text-blue-50 rounded px-1" style="box-shadow: 0 0 10px rgba(59, 130, 246, 0.5)">${m}</mark>`
        );
      }
    }

    // Wrap in pre for basic formatting. Escape HTML in docContent if necessary, but we are using dangerouslySetInnerHTML.
    // To prevent XSS while allowing mark:
    const finalHtml = highlightedHTML
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/&lt;mark class="bg-blue-500\/40 text-blue-50 rounded px-1" style="box-shadow: 0 0 10px rgba\(59, 130, 246, 0\.5\)"&gt;/g, '<mark class="bg-blue-500/40 text-blue-50 rounded px-1 inline-block" style="box-shadow: 0 0 10px rgba(59, 130, 246, 0.5)">')
      .replace(/&lt;\/mark&gt;/g, '</mark>');

    return (
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans"
        dangerouslySetInnerHTML={{ __html: finalHtml }}
      />
    );
  };

  return (
    <div className="w-[380px] border-l border-neutral-800 bg-[#121212] flex flex-col h-full overflow-hidden transition-all duration-300">
      <div className="h-[60px] border-b border-neutral-800 flex items-center justify-between px-5 bg-neutral-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-[14px] text-neutral-100 truncate pr-2 tracking-wide">
            {source.filename || 'Document View'}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {source.snippet && (
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900/20 to-transparent border-b border-blue-900/30">
          <div className="text-[11px] uppercase tracking-wider font-bold text-blue-400 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Highlighted Excerpt
          </div>
          <div className="text-[13px] text-blue-100/70 italic line-clamp-3 leading-relaxed">
            "{source.snippet}"
          </div>
        </div>
      )}

      {renderContent()}
    </div>
  );
}
