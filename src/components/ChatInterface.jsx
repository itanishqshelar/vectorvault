'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUpIcon,
  Paperclip,
  Search,
  FileText,
  MessageSquare,
  Zap,
  HelpCircle,
  Mic,
  Square,
  Radio,
  X,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import LiveVoiceOrb from './LiveVoiceOrb';

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
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-blue-50 hover:text-white transition-all duration-300 cursor-pointer whitespace-nowrap"
      style={{
        background: 'rgba(23, 37, 84, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(30, 58, 138, 0.6)';
        e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(23, 37, 84, 0.4)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function ChatInterface({ messages = [], setMessages, onSourceClick }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatRef = useRef(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 150,
  });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!files.length) return;
    
    const readPromises = files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        resolve({
          name: file.name,
          mimeType: file.type,
          base64,
          previewUrl: file.type.startsWith('image/') ? ev.target.result : null
        });
      };
      reader.readAsDataURL(file);
    }));

    const newAtts = await Promise.all(readPromises);
    setAttachments(prev => [...prev, ...newAtts]);
    e.target.value = null;
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderAttachmentsPreview = () => {
    if (attachments.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0', flexWrap: 'wrap' }}>
        {attachments.map((att, i) => (
          <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#262626', border: '1px solid #404040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {att.previewUrl ? <img src={att.previewUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText style={{ color: '#a3a3a3' }} />}
            <button onClick={() => removeAttachment(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: 'white', padding: '2px', border: 'none', cursor: 'pointer' }}>
              <X style={{ width: '12px', height: '12px' }} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const handleLiveSessionEnd = useCallback((liveMessages) => {
    setMessages((prev) => [...prev, ...liveMessages]);
  }, [setMessages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) {
            setInput((prev) => (prev ? prev + ' ' + data.text : data.text));
            setTimeout(() => adjustHeight(), 0);
          }
        } catch {
          // transcription failed silently
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch {
      // mic permission denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if ((!query && attachments.length === 0) || loading) return;

    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    adjustHeight(true);
    setMessages((prev) => [...prev, { role: 'user', content: query || (currentAttachments.length > 0 ? `Uploaded ${currentAttachments.length} attachment(s)` : '') }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, attachments: currentAttachments.map(a => ({ base64: a.base64, mimeType: a.mimeType, name: a.name })) }),
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
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,application/pdf" style={{ display: 'none' }} />
      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 min-h-0"
      >
        {!hasMessages ? (
          /* Empty state */
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
                {renderAttachmentsPreview()}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your documents..."
                  disabled={loading}
                  className="w-full px-5 py-4 resize-none bg-transparent text-white text-base min-h-[56px] pt-5 placeholder:text-neutral-500"
                  style={{
                    overflow: 'hidden',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#737373', padding: '8px', borderRadius: '6px', display: 'flex' }}>
                    <Paperclip style={{ width: '20px', height: '20px' }} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setIsLiveOpen(true)}
                      disabled={loading}
                      title="Gemini Live Voice"
                      className="live-voice-btn"
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.25))',
                        color: '#818cf8',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Radio style={{ width: '18px', height: '18px' }} />
                    </button>
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      disabled={loading || transcribing}
                      title={recording ? 'Stop recording' : 'Record voice'}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: loading || transcribing ? 'not-allowed' : 'pointer',
                        background: recording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                        color: recording ? '#ef4444' : transcribing ? '#60a5fa' : '#a3a3a3',
                        flexShrink: 0,
                      }}
                    >
                      {recording
                        ? <Square style={{ width: '16px', height: '16px' }} />
                        : <Mic style={{ width: '18px', height: '18px' }} />}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={(!input.trim() && attachments.length === 0) || loading}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: (input.trim() || attachments.length > 0) && !loading ? 'pointer' : 'not-allowed', flexShrink: 0,
                        background: (input.trim() || attachments.length > 0) ? 'linear-gradient(to right, #2563eb, #3b82f6)' : '#262626',
                        color: (input.trim() || attachments.length > 0) ? 'white' : '#737373',
                        boxShadow: (input.trim() || attachments.length > 0) ? '0 10px 15px -3px rgba(37,99,235,0.3)' : 'none',
                      }}
                    >
                      <ArrowUpIcon style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
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
              <MessageBubble key={i} message={msg} onSourceClick={onSourceClick} />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#262626', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  V
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(38,38,38,0.8)', border: '1px solid rgba(64,64,64,0.5)' }}>
                  <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                    <div style={{ width: '6px', height: '6px', background: '#737373', borderRadius: '50%', animation: 'typingBounce 1.2s infinite' }} />
                    <div style={{ width: '6px', height: '6px', background: '#737373', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.2s' }} />
                    <div style={{ width: '6px', height: '6px', background: '#737373', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom input - only shows when there are messages */}
      {hasMessages && (
        <div className="px-6 py-4 bg-neutral-900/60 backdrop-blur-xl" style={{ borderTop: '1px solid #262626' }}>
          <div className="w-full">
            <div
              className="relative bg-black/60 backdrop-blur-md rounded-xl"
              style={{ border: '1px solid #404040' }}
            >
              {renderAttachmentsPreview()}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                disabled={loading}
                className="w-full px-5 py-4 resize-none bg-transparent text-white text-base min-h-[56px] pt-5 placeholder:text-neutral-500"
                style={{
                  overflow: 'hidden',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#737373', padding: '8px', borderRadius: '6px', display: 'flex' }}>
                  <Paperclip style={{ width: '20px', height: '20px' }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIsLiveOpen(true)}
                    disabled={loading}
                    title="Gemini Live Voice"
                    className="live-voice-btn"
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.25))',
                      color: '#818cf8',
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Radio style={{ width: '18px', height: '18px' }} />
                  </button>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading || transcribing}
                    title={recording ? 'Stop recording' : 'Record voice'}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: loading || transcribing ? 'not-allowed' : 'pointer',
                      background: recording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                      color: recording ? '#ef4444' : transcribing ? '#60a5fa' : '#a3a3a3',
                      flexShrink: 0,
                    }}
                  >
                    {recording
                      ? <Square style={{ width: '16px', height: '16px' }} />
                      : <Mic style={{ width: '18px', height: '18px' }} />}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={(!input.trim() && attachments.length === 0) || loading}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', border: 'none', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: (input.trim() || attachments.length > 0) && !loading ? 'pointer' : 'not-allowed', flexShrink: 0,
                      background: (input.trim() || attachments.length > 0) ? 'linear-gradient(to right, #2563eb, #3b82f6)' : '#404040',
                      color: (input.trim() || attachments.length > 0) ? 'white' : '#a3a3a3',
                      boxShadow: (input.trim() || attachments.length > 0) ? '0 10px 15px -3px rgba(37,99,235,0.25)' : 'none',
                    }}
                  >
                    <ArrowUpIcon style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Voice Orb Overlay */}
      <LiveVoiceOrb
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
        onSessionEnd={handleLiveSessionEnd}
      />
    </>
  );
}
