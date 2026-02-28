import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Maximize2, Minimize2, TrendingUp, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedApp {
  id: number;
  name: string;
  icon_url: string;
  is_popular: boolean;
  description: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';
const CHAT_URL = `${API_BASE_URL}/api/ai/chat/stream`;

// Parse [APP:id:name:icon_url:is_popular:description] tags from message content
const parseAppTags = (content: string): { text: string; apps: ParsedApp[] }[] => {
  const appTagRegex = /\[APP:(\d+):([^:]+):([^:]+):([^:]*):([^\]]+)\]/g;
  const fourPartRegex = /\[APP:(\d+):([^:]+):((?:https?:\/\/[^:]+|\/[^:]+)):([^\]]+)\]/g;
  const oldFormatRegex = /\[APP:(\d+):([^:]+):([^\]]+)\]/g;
  
  let apps: ParsedApp[] = [];
  let cleanText = content;
  
  // Try 5-part format first (with is_popular)
  let match;
  const fivePartMatches: ParsedApp[] = [];
  const appTagRegexLocal = /\[APP:(\d+):([^:]+):([^:]+):([^:]*):([^\]]+)\]/g;
  while ((match = appTagRegexLocal.exec(content)) !== null) {
    fivePartMatches.push({
      id: parseInt(match[1], 10),
      name: match[2],
      icon_url: match[3],
      is_popular: match[4] === 'true',
      description: match[5]
    });
    cleanText = cleanText.replace(match[0], '');
  }
  
  if (fivePartMatches.length > 0) {
    apps = fivePartMatches;
  } else {
    // Try 4-part format with URL
    const fourPartRegexLocal = /\[APP:(\d+):([^:]+):([^:]+):([^\]]+)\]/g;
    const fourPartMatches: ParsedApp[] = [];
    while ((match = fourPartRegexLocal.exec(content)) !== null) {
      fourPartMatches.push({
        id: parseInt(match[1], 10),
        name: match[2],
        icon_url: match[3],
        is_popular: false,
        description: match[4]
      });
      cleanText = cleanText.replace(match[0], '');
    }
    
    if (fourPartMatches.length > 0) {
      apps = fourPartMatches;
    } else {
      // Fallback to old 3-part format
      const oldFormatRegexLocal = /\[APP:(\d+):([^:]+):([^\]]+)\]/g;
      while ((match = oldFormatRegexLocal.exec(content)) !== null) {
        apps.push({
          id: parseInt(match[1], 10),
          name: match[2],
          icon_url: "",
          is_popular: false,
          description: match[3]
        });
        cleanText = cleanText.replace(match[0], '');
      }
    }
  }
  
  // Clean up the text
  cleanText = cleanText.split('\n').filter(line => line.trim()).join('\n').trim();
  
  if (apps.length > 0) {
    return [{ text: cleanText, apps }];
  }
  
  return [{ text: content, apps: [] }];
};

const createSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};


// Typing dots animation component
const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
    <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
    <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
  </div>
);

// App Card Component for chat recommendations
const AppRecommendCard = ({ app, onClick, isFullPage }: { app: ParsedApp; onClick: () => void; isFullPage?: boolean }) => {
  const { language } = useLanguage();
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600", 
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
  ];
  
  const gradientIndex = app.id % gradients.length;
  
  // Use icon URL directly as-is from API
  const iconUrl = app.icon_url || "";
  const hasIcon = iconUrl.length > 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex gap-3 rounded-xl bg-background border hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 w-full text-left group",
        isFullPage ? "p-4 items-start" : "p-3 items-start"
      )}
    >
      {hasIcon ? (
        <img 
          src={iconUrl} 
          alt={app.name}
          className={cn(
            "rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition-transform",
            isFullPage ? "w-16 h-16" : "w-12 h-12"
          )}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={cn(
          "rounded-xl bg-gradient-to-br items-center justify-center text-white font-bold shrink-0 shadow-md group-hover:scale-105 transition-transform",
          gradients[gradientIndex],
          isFullPage ? "w-16 h-16 text-xl" : "w-12 h-12 text-lg"
        )}
        style={{ display: hasIcon ? 'none' : 'flex' }}
      >
        {app.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={cn(
            "font-medium text-foreground group-hover:text-primary transition-colors",
            isFullPage ? "text-base" : "text-sm"
          )}>
            {app.name}
          </h4>
          {app.is_popular && (
            <Badge variant="secondary" className="gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <TrendingUp className="h-3 w-3" />
              {language === 'km' ? 'ពេញនិយម' : 'Popular'}
            </Badge>
          )}
        </div>
        <p className={cn(
          "text-muted-foreground mt-1",
          isFullPage ? "text-sm" : "text-xs line-clamp-2"
        )}>
          {app.description}
        </p>
      </div>
    </button>
  );
};

// Message content renderer with app cards
const MessageContent = ({ content, onAppClick, isFullPage }: { content: string; onAppClick: (id: number, name: string) => void; isFullPage?: boolean }) => {
  const parsed = parseAppTags(content);
  
  return (
    <div className="space-y-2">
      {parsed.map((section, idx) => (
        <div key={idx}>
          {section.text && (
            <p className={cn("whitespace-pre-wrap", isFullPage ? "text-base" : "text-sm")}>{section.text}</p>
          )}
          {section.apps.length > 0 && (
            <div className={cn("mt-2", isFullPage ? "space-y-3" : "space-y-2")}>
              {section.apps.map((app) => (
                <AppRecommendCard 
                  key={app.id} 
                  app={app} 
                  onClick={() => onAppClick(app.id, app.name)}
                  isFullPage={isFullPage}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullPage, setIsFullPage] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load chat history from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem('ai-chat-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Save chat history to sessionStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('ai-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key to close full page mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullPage) {
        setIsFullPage(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullPage]);

  const handleAppClick = (id: number, name: string) => {
    setIsOpen(false);
    setIsFullPage(false);
    navigate(`/${id}`);
  };

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok || !resp.body) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: language === 'km' 
            ? "សូមអភ័យទោស មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។" 
            : "Sorry, something went wrong. Please try again." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem('ai-chat-history');
  };

  const welcomeMessage = language === 'km' 
    ? "សួស្តី! 👋 ខ្ញុំជាជំនួយការ AI របស់អ្នក។ សូមប្រាប់ខ្ញុំអំពីអ្វីដែលអ្នកត្រូវការ ហើយខ្ញុំនឹងណែនាំកម្មវិធីដ៏ល្អបំផុតសម្រាប់អ្នក!"
    : "Hi there! 👋 I'm your AI assistant. Tell me what you need and I'll recommend the best apps for you!";

  // Full page chat view
  if (isFullPage) {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-in fade-in duration-200">
        <div className="h-full flex flex-col max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">
                  {language === 'km' ? 'ជំនួយការ AI' : 'AI Assistant'}
                </h3>
                <p className="text-sm text-white/80">
                  {language === 'km' ? 'ស្វែងរកកម្មវិធីល្អបំផុត' : 'Find the perfect app'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title={language === 'km' ? 'សម្អាតការសន្ទនា' : 'Clear chat'}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullPage(false)}
                className="text-white hover:bg-white/20 h-10 w-10"
                title={language === 'km' ? 'បង្រួម' : 'Minimize'}
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsFullPage(false); setIsOpen(false); }}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex gap-4 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-4 max-w-[80%]">
                  <p className="text-base">{welcomeMessage}</p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-4 mb-6",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/10"
                )}>
                  {message.role === "user" 
                    ? <User className="h-5 w-5" />
                    : <Bot className="h-5 w-5 text-primary" />
                  }
                </div>
                <div className={cn(
                  "rounded-2xl px-5 py-4 max-w-[80%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  {message.role === "assistant" ? (
                    <MessageContent content={message.content} onAppClick={handleAppClick} isFullPage />
                  ) : (
                    <p className="text-base whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-4 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-4">
                  <TypingDots />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-6 border-t bg-background shrink-0">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={language === 'km' ? 'សរសេរសារ...' : 'Type a message...'}
                className="flex-1 rounded-full bg-muted border-0 h-12 px-5 text-base"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-full h-12 w-12 shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Button with Pulsing Animation */}
      <div className={cn("fixed bottom-6 right-6 z-50", isOpen && "hidden")}>
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: '2s' }} />
        {/* Inner pulse ring */}
        <div className="absolute -inset-2 rounded-full bg-primary/20 animate-pulse" />
        
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-2xl",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 hover:scale-110",
            "ring-4 ring-primary/30"
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {/* Green notification dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background" />
          </span>
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'km' ? 'ជំនួយការ AI' : 'AI Assistant'}
                  </h3>
                  <p className="text-xs text-white/80">
                    {language === 'km' ? 'ស្វែងរកកម្មវិធីល្អបំផុត' : 'Find the perfect app'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearChat}
                    className="text-white hover:bg-white/20 h-8 w-8"
                    title={language === 'km' ? 'សម្អាតការសន្ទនា' : 'Clear chat'}
                    
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullPage(true)}
                  className="text-white hover:bg-white/20 h-8 w-8"
                  title={language === 'km' ? 'ពង្រីកទំហំពេញ' : 'Full screen'}
                  
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="flex gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-sm">{welcomeMessage}</p>
                  </div>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 mb-4",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/10"
                  )}>
                    {message.role === "user" 
                      ? <User className="h-4 w-4" />
                      : <Bot className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}>
                    {message.role === "assistant" ? (
                      <MessageContent content={message.content} onAppClick={handleAppClick} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <TypingDots />
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={language === 'km' ? 'សរសេរសារ...' : 'Type a message...'}
                  className="flex-1 rounded-full bg-muted border-0"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};
