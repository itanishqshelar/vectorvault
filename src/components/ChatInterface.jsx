'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowUpIcon,
  Paperclip,
  Search,
  FileText,
  MessageSquare,
  Zap,
  HelpCircle,
} from 'lucide-react';
import MessageBubble from './MessageBubble';

function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

function tryParseJSON(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      return null;
    }
  }
  return null;
}

function QuickAction({ icon, label, onClick }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-950/40 backdrop-blur-md text-blue-50 hover:text-white hover:bg-blue-900/60 hover:border-blue-400/40 transition-all duration-300 px-5 py-5"
    >
      {icon}
      <span className="text-[13px] font-medium">{label}</span>
    </Button>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 150,
  });

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    adjustHeight(true);
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        setMessages((prev) => [...prev, { role: 'ai', content: '', parsed: null }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    last.content = fullText;
                    last.parsed = tryParseJSON(fullText);
                    return updated;
                  });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          last.parsed = tryParseJSON(last.content) || last.parsed;
          return updated;
        });
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: data.answer, parsed: data },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Error: ${err.message}`, parsed: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const setQuickInput = (text) => {
    setInput(text);
    setTimeout(() => adjustHeight(), 0);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4"
      >
        {!hasMessages ? (
          /* Empty state - RuixenMoonChat inspired with semi-sphere */
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Star field particles */}
            <div className="star-field">
              <div className="star" style={{ top: '10%', left: '15%', animationDelay: '0s', animationDuration: '5s' }} />
              <div className="star" style={{ top: '20%', left: '80%', animationDelay: '1.2s', animationDuration: '4s' }} />
              <div className="star" style={{ top: '35%', left: '25%', animationDelay: '0.5s', animationDuration: '6s' }} />
              <div className="star" style={{ top: '15%', left: '60%', animationDelay: '2s', animationDuration: '3.5s' }} />
              <div className="star" style={{ top: '8%', left: '45%', animationDelay: '1.8s', animationDuration: '5.5s' }} />
              <div className="star" style={{ top: '28%', left: '70%', animationDelay: '0.8s', animationDuration: '4.5s' }} />
              <div className="star" style={{ top: '5%', left: '35%', animationDelay: '3s', animationDuration: '6s' }} />
              <div className="star" style={{ top: '22%', left: '90%', animationDelay: '1.5s', animationDuration: '3.8s' }} />
              <div className="star" style={{ top: '40%', left: '10%', animationDelay: '2.5s', animationDuration: '5.2s' }} />
              <div className="star" style={{ top: '12%', left: '50%', animationDelay: '0.3s', animationDuration: '4.2s' }} />
            </div>

            {/* Ambient glow */}
            <div className="ambient-glow" />

            {/* Title and subtitle */}
            <div className="text-center mb-16 relative z-10">
              <h1 className="text-5xl font-bold text-white font-[family-name:var(--font-display)] title-glow">
                VectorVault AI
              </h1>
              <p className="mt-3 text-base subtitle-gradient font-medium">
                Ask your documents anything — just start typing below.
              </p>
            </div>

            {/* Input box - glassmorphic */}
            <div className="w-full max-w-3xl relative z-10">
              <div className="relative glass-input rounded-2xl">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your documents..."
                  className={cn(
                    'w-full px-5 py-4 resize-none border-none',
                    'bg-transparent text-white text-base',
                    'focus-visible:ring-0 focus-visible:ring-offset-0',
                    'placeholder:text-neutral-500 min-h-[56px] pt-5'
                  )}
                  style={{ overflow: 'hidden' }}
                  disabled={loading}
                />
                <div className="flex items-center justify-between px-4 pb-3 mt-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-neutral-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || loading}
                    className={cn(
                      'rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all duration-200',
                      input.trim()
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-indigo-500/40'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    )}
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-center flex-wrap gap-2.5 mt-6">
                <QuickAction
                  icon={<Search className="w-3.5 h-3.5" />}
                  label="Search Documents"
                  onClick={() => setQuickInput('What are the key topics across all my documents?')}
                />
                <QuickAction
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Summarize"
                  onClick={() => setQuickInput('Summarize the main points from my uploaded documents.')}
                />
                <QuickAction
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Compare Sources"
                  onClick={() => setQuickInput('Are there any conflicting information across my documents?')}
                />
                <QuickAction
                  icon={<Zap className="w-3.5 h-3.5" />}
                  label="Key Insights"
                  onClick={() => setQuickInput('What are the most important insights from my documents?')}
                />
                <QuickAction
                  icon={<HelpCircle className="w-3.5 h-3.5" />}
                  label="How It Works"
                  onClick={() => setQuickInput('How does VectorVault process and search my documents?')}
                />
              </div>
            </div>

            {/* Moon semi-sphere - rises from bottom */}
            <div className="moon-container">
              <div className="moon-sphere" />
            </div>

            {/* Orbital ring decoration */}
            <div className="orbital-ring" />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 max-w-3xl animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-neutral-800 text-indigo-400 flex items-center justify-center text-sm flex-shrink-0">
                  V
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50">
                  <div className="flex gap-1 py-1">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" style={{ animation: 'typingBounce 1.2s infinite' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" style={{ animation: 'typingBounce 1.2s infinite 0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" style={{ animation: 'typingBounce 1.2s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom input - only shows when there are messages */}
      {hasMessages && (
        <div className="px-6 py-4 bg-neutral-900/60 backdrop-blur-xl border-t border-neutral-800">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700">
              <Textarea
                ref={!hasMessages ? undefined : textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                className={cn(
                  'w-full px-5 py-4 resize-none border-none',
                  'bg-transparent text-white text-base',
                  'focus-visible:ring-0 focus-visible:ring-offset-0',
                  'placeholder:text-neutral-500 min-h-[56px] pt-5'
                )}
                style={{ overflow: 'hidden' }}
                disabled={loading}
              />
              <div className="flex items-center justify-between p-3 mt-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-neutral-500 hover:text-white hover:bg-neutral-700"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className={cn(
                    'rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all',
                    input.trim()
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5'
                      : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  )}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
