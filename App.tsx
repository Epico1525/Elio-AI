import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, ArrowUp, Code2, Sparkles, Settings2, Plus, Paperclip, X, PanelLeft, PanelLeftClose, MessageSquare, History } from 'lucide-react';
import { Sender, Message, Attachment, ChatHistoryItem } from './types';
import { sendMessageStream, initializeChat, resetChat, generateSuggestions } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ThinkingIndicator from './components/ThinkingIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<{icon: string, text: string}[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // History State
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Initialize chat on mount or config change
  useEffect(() => {
    initializeChat(useThinking);
    // Responsive sidebar: close on mobile by default
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    
    // Load history from local storage
    const savedHistory = localStorage.getItem('elio_chat_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, [useThinking]);

  // Load dynamic suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      const newSuggestions = await generateSuggestions();
      setSuggestions(newSuggestions);
    };
    loadSuggestions();
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('elio_chat_history', JSON.stringify(history));
  }, [history]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachments]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    adjustTextareaHeight();
  };

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the "data:*/*;base64," prefix
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert file to string"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newAttachments: Attachment[] = [];

      for (const file of files) {
        try {
          const base64Data = await fileToBase64(file);
          newAttachments.push({
            mimeType: file.type,
            data: base64Data,
            fileName: file.name
          });
        } catch (error) {
          console.error("Error processing file:", error);
        }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input value to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Save the current chat session to history
  const saveCurrentSession = () => {
    if (messages.length === 0) return;

    const title = messages[0].text.slice(0, 30) + (messages[0].text.length > 30 ? '...' : '');
    const chatId = activeChatId || Date.now().toString();

    const newItem: ChatHistoryItem = {
      id: chatId,
      title: title || "New Chat",
      messages: messages,
      timestamp: Date.now()
    };

    setHistory(prev => {
      const exists = prev.find(item => item.id === chatId);
      if (exists) {
        return prev.map(item => item.id === chatId ? newItem : item);
      }
      return [newItem, ...prev];
    });
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
       saveCurrentSession();
    }
    
    setMessages([]);
    setAttachments([]);
    setHasStarted(false);
    setActiveChatId(null);
    resetChat();
    initializeChat(useThinking);
    
    // Refresh suggestions
    setSuggestions([]); 
    generateSuggestions().then(setSuggestions);
  };

  const loadHistoryItem = (item: ChatHistoryItem) => {
    // Save current if needed before switching
    if (messages.length > 0 && activeChatId !== item.id) {
      saveCurrentSession();
    }

    setMessages(item.messages);
    setActiveChatId(item.id);
    setHasStarted(true);
    setAttachments([]);
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    // If this is the first message of a new session, set an ID
    if (!activeChatId) {
      setActiveChatId(Date.now().toString());
    }

    // Capture attachments for this message
    const currentAttachments = [...attachments];
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: Sender.User,
      timestamp: Date.now(),
      attachments: currentAttachments
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setAttachments([]); // Clear attachments after sending
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);
    setHasStarted(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessagePlaceholder: Message = {
      id: aiMessageId,
      text: '',
      sender: Sender.AI,
      timestamp: Date.now(),
    };
    
    let fullResponse = '';

    try {
      await sendMessageStream(userMessage.text, currentAttachments, (chunk) => {
        fullResponse += chunk;
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.id === aiMessageId) {
            return [...prev.slice(0, -1), { ...lastMsg, text: fullResponse }];
          } else {
            return [...prev, { ...aiMessagePlaceholder, text: fullResponse }];
          }
        });
      });
      
      // Auto-save after AI response is complete (in a real app you might want to debounce this)
      // Since we don't have a reliable "done" callback in this simple stream implementation tailored for React updates,
      // we rely on the user navigating away or starting new chat to save, 
      // OR we can trigger a save effect when loading stops. 
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I encountered an error connecting to the AI. Please check your API key and internet connection.",
        sender: Sender.AI,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to save chat when loading finishes (simple auto-save)
  useEffect(() => {
    if (!isLoading && messages.length > 0 && activeChatId) {
      saveCurrentSession();
    }
  }, [isLoading, messages, activeChatId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // UI Helper: Determine if the send button should be active
  const isSendActive = (!!inputText.trim() || attachments.length > 0) && !isLoading;

  return (
    <div className="flex h-screen text-gray-100 font-sans overflow-hidden bg-[#0d0d0d]">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="image/*,application/pdf,text/*"
      />

      {/* Sidebar */}
      <aside 
        className={`
          ${isSidebarOpen ? 'w-[260px] translate-x-0' : 'w-0 -translate-x-full opacity-0'}
          bg-[#121212] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
        `}
      >
        <div className="p-4 flex items-center justify-between h-16">
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        <div className="px-3 pb-4">
           <button 
             onClick={handleNewChat}
             className="flex items-center gap-2 w-full px-3 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-sm text-white group"
           >
             <div className="p-1 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
               <Plus size={16} />
             </div>
             <span className="font-medium">New Chat</span>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
           <div className="flex items-center gap-2 px-2 mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
             <History size={12} />
             <span>Recent</span>
           </div>
           
           <div className="space-y-1">
             {history.length === 0 ? (
               <div className="text-center py-8 text-gray-600 text-xs">No recent chats</div>
             ) : (
               history.map((item) => (
                 <button 
                   key={item.id}
                   onClick={() => loadHistoryItem(item)}
                   className={`
                     w-full text-left px-3 py-2.5 text-sm rounded-lg truncate transition-colors flex items-center justify-between group
                     ${activeChatId === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                   `}
                 >
                   <div className="flex items-center gap-2 overflow-hidden">
                     <MessageSquare size={14} className={activeChatId === item.id ? 'opacity-100' : 'opacity-50'} />
                     <span className="truncate">{item.title}</span>
                   </div>
                   
                   <div 
                     onClick={(e) => deleteHistoryItem(e, item.id)}
                     className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                   >
                     <Trash2 size={12} />
                   </div>
                 </button>
               ))
             )}
           </div>
        </div>

        <div className="p-4 border-t border-white/5 mt-auto">
           <button className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-xl transition-colors text-sm text-gray-300">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                EA
              </div>
              <div className="flex flex-col text-left">
                <span className="font-medium text-white">Elio User</span>
                <span className="text-[10px] text-gray-500">Free Plan</span>
              </div>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full min-w-0 bg-[#0d0d0d]">
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 px-4 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
             {!isSidebarOpen && (
               <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
               >
                 <PanelLeft size={20} />
               </button>
             )}
             <div className="flex items-center gap-2 cursor-pointer opacity-90">
                <span className="text-lg font-semibold tracking-tight text-white">Elio</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => {
                if (hasStarted) {
                  if(window.confirm("Changing modes will start a new chat. Continue?")) {
                    setUseThinking(!useThinking);
                    handleNewChat();
                  }
                } else {
                  setUseThinking(!useThinking);
                }
              }}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md border
                ${useThinking 
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }
              `}
            >
              <Settings2 size={14} />
              {useThinking ? 'Deep Thinking' : 'Standard'}
            </button>
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-1 overflow-y-auto relative z-0 scroll-smooth">
          <div className="max-w-3xl mx-auto h-full flex flex-col pt-20 px-4 pb-48">
            
            {/* Welcome Screen */}
            {!hasStarted && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-[fadeIn_0.5s_ease-out_forwards]">
                <div className="mb-8 p-4 bg-white/5 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl animate-float">
                  <Code2 size={48} className="text-white/80" />
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold mb-3 text-white tracking-tight">How can I help you?</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-12">
                  {suggestions.length === 0 ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                    ))
                  ) : (
                    suggestions.map((item, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setInputText(item.text);
                          if (textareaRef.current) textareaRef.current.focus();
                        }}
                        className="group flex items-start gap-4 p-5 text-left bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-white/20 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                      >
                        <span className="text-xl bg-white/5 p-2 rounded-lg">{item.icon}</span>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white mt-2">{item.text}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="mb-6 flex justify-start">
                 {useThinking ? <ThinkingIndicator /> : (
                   <div className="flex items-center gap-1 p-3 rounded-2xl">
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-150"></div>
                   </div>
                 )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto flex flex-col gap-2">
            
            {/* Attachments Preview Area */}
            <div className={`transition-all duration-500 ease-in-out ${attachments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute'}`}>
              <div className="flex gap-2 overflow-x-auto pb-2 pl-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group flex-shrink-0 w-16 h-16 rounded-xl border border-white/20 bg-[#1e1f20] overflow-hidden shadow-lg animate-[fadeIn_0.3s_ease-out]">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <span className="text-[10px] text-gray-400 p-1 text-center break-words">{att.fileName.slice(0, 8)}...</span>
                      </div>
                    )}
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Wrapper to handle glow and border animations */}
            <div className="relative group animate-slide-up">
              
              <div 
                className={`
                  absolute -inset-[1px] rounded-[2.2rem] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 opacity-0 blur-sm transition-all duration-700
                  ${!hasStarted ? 'opacity-50 animate-glow-pulse' : 'group-focus-within:opacity-40 group-focus-within:blur-md'}
                `}
              ></div>

              {/* Input Container */}
              <div className={`
                relative flex items-end gap-2 bg-[#1e1f20] rounded-[2rem] p-2 pr-2 pl-4 border transition-all duration-500 shadow-2xl
                ${!hasStarted 
                  ? 'border-white/20 shadow-blue-900/20' 
                  : 'border-white/10 shadow-black/50 focus-within:border-white/20'
                }
              `}>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 mb-2 rounded-full flex items-center justify-center flex-shrink-0 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={hasStarted ? "Reply..." : "Ask Elio anything..."}
                  className={`
                    w-full bg-transparent text-white placeholder-gray-500 py-4 min-h-[56px] max-h-[200px] resize-none focus:outline-none text-base font-sans transition-all
                  `}
                  rows={1}
                />
                
                {/* Send Button */}
                <button
                  onClick={() => handleSubmit()}
                  disabled={!isSendActive}
                  className={`
                    w-10 h-10 mb-2 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${isSendActive
                      ? 'bg-white text-black hover:bg-gray-200 shadow-lg scale-100' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed scale-95'
                    }
                  `}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <ArrowUp size={20} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
            
            <div className={`text-center mt-3 text-[11px] text-gray-500 font-medium transition-opacity duration-700 ${!hasStarted ? 'opacity-100' : 'opacity-50'}`}>
              Elio can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;