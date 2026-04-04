'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SourceCard from './SourceCard';
import ConflictBanner from './ConflictBanner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MessageBubble({ message, onSourceClick }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 4px 16px',
              color: 'white',
              fontSize: '14px',
              lineHeight: '1.625',
              background: 'linear-gradient(to right, #2563eb, #3b82f6)',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {message.content}
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            }}
          >
            U
          </div>
        </div>
      </div>
    );
  }

  const parsed = message.parsed;

  const avatarStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#262626',
    color: '#60a5fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  };

  const bubbleStyle = {
    minWidth: 0,
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 4px',
    background: 'rgba(38, 38, 38, 0.8)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(64, 64, 64, 0.5)',
    fontSize: '14px',
    lineHeight: '1.625',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };

  const markdownComponents = {
    p: ({node, ...props}) => <p style={{ marginBottom: '0.75em', whiteSpace: 'pre-wrap' }} {...props} />,
    ul: ({node, ...props}) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.5em', marginBottom: '0.75em' }} {...props} />,
    ol: ({node, ...props}) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5em', marginBottom: '0.75em' }} {...props} />,
    li: ({node, ...props}) => <li style={{ marginBottom: '0.25em' }} {...props} />,
    strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
    em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
    a: ({node, ...props}) => <a style={{ color: '#60a5fa', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />,
    pre: ({node, ...props}) => <pre style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '100%', marginBottom: '0.75em' }} {...props} />,
    code: ({node, inline, ...props}) => <code style={{ background: inline ? 'rgba(0, 0, 0, 0.2)' : 'transparent', padding: inline ? '2px 4px' : '0', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.9em' }} {...props} />
  };

  if (!parsed) {
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px', animation: 'fadeIn 0.3s ease' }}>
        <div style={avatarStyle}>V</div>
        <div style={{ ...bubbleStyle, color: '#e5e5e5' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px', animation: 'fadeIn 0.3s ease' }}>
      <div style={avatarStyle}>V</div>
      <div style={bubbleStyle}>
        <div style={{ color: '#e5e5e5' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {parsed.answer}
          </ReactMarkdown>
        </div>

        {parsed.sources && parsed.sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {parsed.sources.map((src, i) => (
              <SourceCard key={i} source={src} onClick={onSourceClick} />
            ))}
          </div>
        )}

        {parsed.conflict_detected !== undefined && (
          <ConflictBanner
            detected={parsed.conflict_detected}
            details={parsed.conflict_details}
          />
        )}

        {parsed.reasoning && (
          <>
            <button
              style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#737373',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? (
                <ChevronDown style={{ width: '12px', height: '12px' }} />
              ) : (
                <ChevronRight style={{ width: '12px', height: '12px' }} />
              )}
              Reasoning
            </button>
            {showReasoning && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '10px 12px',
                  background: 'rgba(23, 23, 23, 0.6)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#a3a3a3',
                  lineHeight: '1.625',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {parsed.reasoning}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
