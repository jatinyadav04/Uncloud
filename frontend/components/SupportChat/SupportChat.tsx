import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import api, { ChatMessage, VideoResource, WebResource } from '../../services/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.4:8000';

interface SupportChatProps {
  userId: string;
  initialChatId?: string;
  className?: string;
  proactiveMessage?: string;
}

// Message extended with optional inline videos
interface MessageWithVideos extends ChatMessage {
  videos?: VideoResource[];
  resources?: WebResource[];
}

// Fix 6: dynamic suggestions based on last assistant message
function getDynamicSuggestions(messages: MessageWithVideos[]): string[] {
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const text = lastAssistant?.content?.toLowerCase() || '';

  if (text.includes('craving') || text.includes('urge')) {
    return [
      "The craving is really intense right now",
      "How long will this craving last?",
      "Give me a breathing exercise",
      "What can I do in the next 5 minutes?",
      "Show me videos about cravings",
    ];
  }
  if (text.includes('relapse') || text.includes('slip') || text.includes('smoked')) {
    return [
      "I feel really guilty about slipping",
      "How do I get back on track?",
      "Is one cigarette a full relapse?",
      "Show me relapse recovery videos",
      "What's my next step now?",
    ];
  }
  if (text.includes('stress') || text.includes('anxious') || text.includes('anxiety')) {
    return [
      "My stress is making it impossible to quit",
      "Give me a stress relief technique",
      "Show me breathing exercises",
      "How do I handle work stress without smoking?",
      "I'm feeling overwhelmed",
    ];
  }
  // Default
  return [
    "I'm having a strong craving right now",
    "I had a relapse yesterday",
    "What should I do when I feel like smoking?",
    "Can you suggest some coping techniques?",
    "How long do nicotine cravings usually last?",
    "I'm feeling anxious without cigarettes",
  ];
}

// Fix 7: compact inline video card
const InlineVideoCard: React.FC<{ video: VideoResource }> = ({ video }) => (
  <a
    href={video.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-primary/30 transition-all mt-2"
  >
    <div className="w-20 h-14 flex-shrink-0 bg-gray-200">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
    </div>
    <div className="flex-1 py-1 pr-2 min-w-0">
      <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{video.title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{video.channel}</p>
    </div>
    <svg className="w-4 h-4 text-primary flex-shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  </a>
);

const SupportChat: React.FC<SupportChatProps> = ({ userId, initialChatId, className = '', proactiveMessage }) => {
  const formId = useId();
  const inputId = useId();

  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [messages, setMessages] = useState<MessageWithVideos[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resources, setResources] = useState<WebResource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [realTimeResults, setRealTimeResults] = useState<VideoResource[]>([]);
  const [showRealTimeResults, setShowRealTimeResults] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chatId) {
      loadChatHistory(chatId);
    } else {
      const welcomeText = "Hi there! I'm your Cleanslate support assistant. How are you feeling today? You can talk to me about any challenges you're facing with quitting smoking, ask for advice, or just chat about how things are going.";
      if (proactiveMessage) {
        // Show welcome first, then the proactive alert as a second message
        setMessages([
          { role: 'assistant', content: welcomeText },
          {
            role: 'assistant',
            content: proactiveMessage,
          },
        ]);
      } else {
        setMessages([{ role: 'assistant', content: welcomeText }]);
      }
    }
  }, [chatId, proactiveMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fix 5: real-time search calls the dedicated endpoint, never touches chat
  const handleRealTimeSearch = useCallback((query: string) => {
    if (query.length < 4) {
      setShowRealTimeResults(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/chat/search-videos?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.videos && data.videos.length > 0) {
            setRealTimeResults(data.videos);
            setShowRealTimeResults(true);
          } else {
            setShowRealTimeResults(false);
          }
        }
      } catch (err) {
        console.error('Real-time search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (
      inputValue.toLowerCase().includes('video') ||
      inputValue.toLowerCase().includes('watch') ||
      inputValue.toLowerCase().includes('craving') ||
      inputValue.length > 15
    ) {
      handleRealTimeSearch(inputValue);
    } else {
      setShowRealTimeResults(false);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [inputValue, handleRealTimeSearch]);

  const loadChatHistory = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await api.getChatHistory(id);
      setMessages(response.messages);
    } catch {
      setError('Failed to load chat history. Starting a new conversation.');
      setMessages([{ role: 'assistant', content: "Hi there! I'm your Cleanslate support assistant. How can I help you today?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setShowRealTimeResults(false);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      setIsLoading(true);
      setResources([]);

      const response = await api.sendChatMessage(userId, userMessage, chatId);
      if (!chatId) setChatId(response.chatId);

      // Fix 7: attach videos directly to the assistant message
      const assistantMsg: MessageWithVideos = {
        role: 'assistant',
        content: response.message,
        videos: response.videos || undefined,
        resources: response.resources || undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.resources) setResources(response.resources);
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowRealTimeResults(false);
    inputRef.current?.focus();
  };

  const handleVideoClick = (video: VideoResource) => {
    setInputValue(`I'd like to watch videos about ${video.title.toLowerCase()}`);
    setShowRealTimeResults(false);
    inputRef.current?.focus();
  };

  const suggestions = getDynamicSuggestions(messages);

  return (
    <Card className={`flex flex-col h-[700px] bg-white shadow-xl border-0 rounded-xl overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-primary to-secondary p-4 text-white">
        <h2 className="font-bold text-lg">Cleanslate Support Assistant</h2>
        <p className="text-sm opacity-80">Get help with cravings, relapses, or any questions</p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-sm">🚭</span>
              </div>
            )}
            <div className="max-w-[80%]">
              <div className={`rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-purple-400 text-black rounded-tr-none shadow-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
              }`}>
                {message.content}
              </div>
              {/* Fix 7: inline videos below assistant bubble */}
              {message.role === 'assistant' && message.videos && message.videos.length > 0 && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium ml-1">📹 Recommended videos:</p>
                  {message.videos.map((video, vi) => (
                    <InlineVideoCard key={vi} video={video} />
                  ))}
                </div>
              )}
              {/* Inline resources */}
              {message.role === 'assistant' && message.resources && message.resources.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.resources.map((resource, ri) => (
                    <a key={ri} href={resource.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {resource.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                <span className="text-sm">👤</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <span className="text-sm">🚭</span>
            </div>
            <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <span className="flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fix 6: dynamic suggestions */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 mb-2">Suggestions:</div>
        <div className="flex flex-wrap gap-1">
          {suggestions.map((suggestion, idx) => (
            <button key={idx} onClick={() => handleSuggestionClick(suggestion)}
              className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs hover:bg-primary/10 transition-colors">
              {suggestion.length > 28 ? suggestion.substring(0, 28) + '…' : suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t p-4 bg-white">
        <form id={formId} onSubmit={handleSendMessage} className="flex flex-col gap-2">
          {/* Real-time search results panel */}
          {showRealTimeResults && realTimeResults.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-700">Video Suggestions</h4>
                <button type="button" onClick={() => setShowRealTimeResults(false)}
                  className="text-xs bg-red-500 rounded-full text-white px-2 py-0.5 hover:bg-red-600">
                  Hide
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {realTimeResults.map((video, idx) => (
                  <div key={idx} onClick={() => handleVideoClick(video)}
                    className="cursor-pointer flex-shrink-0 w-48 border border-gray-100 rounded-md overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="h-20 bg-gray-100">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{video.title}</p>
                      <p className="text-xs text-gray-500">{video.channel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 mr-2 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
              <span className="text-xs text-gray-500">Finding relevant videos…</span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              disabled={isLoading}
              ref={inputRef}
            />
            <Button type="submit" variant="primary" isLoading={isLoading} className="px-6">
              <span className="mr-1">Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default SupportChat;
