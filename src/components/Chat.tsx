'use client';

import { useState, useRef, FormEvent } from 'react';

interface Message {
  text: string;
  type: 'user' | 'bot' | 'error';
  isHTML?: boolean;
  src?: string;
}

const CONFIG = {
  webhookUrls: [
    'https://n8n.roxonn.com/webhook/bc2fd6a2-4fd8-4147-8252-ec21cd164714/chat'
  ],
  requestTimeoutMs: 360000,
  debug: false
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi there! 👋 I'm your AI video assistant. Give me a topic, and I'll create a short video for you.", type: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (text: string, type: 'user' | 'bot' | 'error', isHTML = false, src = '') => {
    setMessages(prev => [...prev, { text, type, isHTML, src }]);
    scrollToBottom();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isWorking) return;

    setIsWorking(true);
    addMessage(input, 'user');
    setInput('');

    const progressFlow = [
      { delay: 1500, message: (t: string) => `Excellent topic: "${t}"! I'm now writing a script...` },
      { delay: 4000, message: 'Script complete! Generating voiceovers and finding the perfect background clip.' },
      { delay: 8000, message: 'All assets are ready. Rendering the final video now. This might take a moment!' },
      { delay: 4000, message: 'Finishing up and uploading your video...' }
    ];

    const runProgressFlow = async (topic: string) => {
      for (const step of progressFlow) {
        addMessage(typeof step.message === 'function' ? step.message(topic) : step.message, 'bot');
        await sleep(step.delay);
      }
    };

    const triggerWebhook = async (message: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

      try {
        for (const url of CONFIG.webhookUrls) {
          try {
            const requestPayload = {
              chatInput: message,
              message: message,
              timestamp: new Date().toISOString(),
              sessionId: `session_${Date.now()}`
            };

            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(requestPayload),
              signal: controller.signal,
            });

            const contentType = res.headers.get('content-type') || '';
            let responseData;
            if (contentType.includes('application/json')) {
              responseData = await res.json();
            } else {
              const textResponse = await res.text();
              try {
                responseData = JSON.parse(textResponse);
              } catch {
                responseData = { response: textResponse };
              }
            }

            if (res.ok) {
              const videoUrl = extractVideoUrl(responseData);
              if (videoUrl) {
                return { ok: true, status: res.status, url: videoUrl, raw: responseData };
              } else {
                return { ok: true, status: res.status, url: null, raw: responseData };
              }
            } else {
              continue;
            }
          } catch (err) {
            continue;
          }
        }
        return { ok: false, status: 0, error: 'All webhook URLs failed' };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { ok: false, status: 0, error: 'Request timeout' };
        }
        return { ok: false, status: 0, error: err.message };
      } finally {
        clearTimeout(timer);
      }
    };

    const extractVideoUrl = (payload: any): string | null => {
      try {
        if (typeof payload === 'object' && payload !== null) {
          if (payload.publicUrl && typeof payload.publicUrl === 'string') return payload.publicUrl;
          if (payload.url && typeof payload.url === 'string') return payload.url;
          if (payload.response && typeof payload.response === 'object') {
            if (payload.response.publicUrl) return payload.response.publicUrl;
            if (payload.response.url) return payload.response.url;
          }
          if (payload.videoBase64) return `data:video/mp4;base64,${payload.videoBase64}`;
        }
      } catch (e) {
        console.warn('Error parsing payload object:', e);
      }
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
      const azureMatch = text.match(/https:\/\/[^"\s]*\.blob\.core\.windows\.net\/[^"\s]*/i);
      if (azureMatch) return azureMatch[0];
      const videoMatch = text.match(/https?:\/\/[^\s)\"']+\.(mp4|mov|m3u8)(?:[^\s)\"']*)*/i);
      if (videoMatch) return videoMatch[0];
      return null;
    };

    try {
      const webhookPromise = triggerWebhook(input);
      const progressPromise = runProgressFlow(input);

      const webhookResult = await webhookPromise;

      await progressPromise;

      if (webhookResult.ok && webhookResult.url) {
        addMessage('🎉 Your video is ready!', 'bot');
        addMessage('', 'bot', false, webhookResult.url);
      } else if (webhookResult.ok && !webhookResult.url) {
        const rawData = JSON.stringify(webhookResult.raw || {}).substring(0, 500);
        addMessage(`Video processing completed, but couldn't extract the video URL. Raw response: ${rawData}`, 'error');
      } else {
        const errorDetail = webhookResult.error || 'Unknown error';
        addMessage(`Sorry, there was an issue generating your video: ${errorDetail}`, 'error');
      }
    } catch (error: any) {
      addMessage(`An unexpected error occurred: ${error.message}`, 'error');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-logo">
          <span className="logo-main">ROXONN</span>
          <span className="logo-sub">FUTURE TECH</span>
        </div>
      </header>
      <main className="chat-messages" id="chat-messages" aria-live="polite">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}-message`}>
            {msg.src ? (
              <div>
                <video controls style={{ width: '100%', borderRadius: '12px' }} src={msg.src} />
                <div style={{ marginTop: '8px' }}>
                  <a href={msg.src} target="_blank" rel="noopener noreferrer" style={{ marginRight: '12px' }}>
                    View in new tab
                  </a>
                  <a href={msg.src} download={`video_${Date.now()}.mp4`}>
                    Download
                  </a>
                </div>
              </div>
            ) : msg.isHTML ? (
              <p dangerouslySetInnerHTML={{ __html: msg.text }} />
            ) : (
              <p>{msg.text}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <form className="chat-input-form" id="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          id="message-input"
          placeholder="e.g., The future of AI"
          autoComplete="off"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isWorking}
        />
        <button type="submit" id="submit-button" aria-label="Send" disabled={isWorking}>
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
