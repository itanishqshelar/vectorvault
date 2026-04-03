'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

function tryParseJSON(text) {
  // Try to extract JSON from the response (may be wrapped in markdown code blocks)
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

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
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
        // Handle SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        // Add placeholder AI message
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

        // Final parse attempt
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          last.parsed = tryParseJSON(last.content) || last.parsed;
          return updated;
        });
      } else {
        // Handle JSON response (no docs found case)
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

  return (
    <>
      <div className="chat-area" ref={chatRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">{'\u{1F50D}'}</div>
            <div className="chat-empty-title">Ask your documents anything</div>
            <div className="chat-empty-text">
              Upload PDFs, Excel files, or emails, then ask questions to get accurate, source-cited
              answers with automatic conflict detection.
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="message ai">
                <div className="message-avatar">V</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="chat-input-area">
        <form className="chat-input-wrapper" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask a question about your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-send"
            disabled={!input.trim() || loading}
          >
            {'\u2191'}
          </button>
        </form>
      </div>
    </>
  );
}
