import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, Copy, Check, Eye, Code, FileIcon } from 'lucide-react';
import { Message, Sender } from '../types';

interface ChatMessageProps {
  message: Message;
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [isPreview, setIsPreview] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const isHTML = language === 'html' || language === 'xml'; // Basic HTML detection
  const codeContent = String(children).replace(/\n$/, '');

  if (inline || !match) {
    return (
      <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-blue-200" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-white/5 shadow-lg bg-[#141414]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-xs text-gray-400 font-sans">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-300 uppercase">{language}</span>
          
          {isHTML && (
            <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => setIsPreview(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${!isPreview ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Code size={12} />
                Code
              </button>
              <button
                onClick={() => setIsPreview(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${isPreview ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Eye size={12} />
                Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {isPreview && isHTML ? (
          <div className="w-full bg-white h-[400px] resize-y overflow-auto">
            <iframe
              title="Code Preview"
              srcDoc={codeContent}
              className="w-full h-full border-none"
              sandbox="allow-scripts" 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <code className={`${className} block p-4 text-sm font-mono leading-relaxed`} {...props}>
              {children}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAI = message.sender === Sender.AI;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-8 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-4 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1
          ${isAI ? 'bg-transparent border border-white/10' : 'bg-white/10'}
        `}>
          {isAI ? <Sparkles size={16} className="text-blue-400" /> : <User size={16} className="text-gray-300" />}
        </div>

        {/* Message Content */}
        <div className={`
          relative group overflow-hidden flex flex-col gap-2
          ${isAI 
            ? 'bg-transparent text-gray-100 pr-4' 
            : 'items-end'
          }
        `}>
          
          {/* User Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-1 ${!isAI && 'justify-end'}`}>
              {message.attachments.map((att, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-xl border border-white/10 group/att">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-32 w-auto object-cover" />
                  ) : (
                    <div className="h-16 px-4 bg-white/5 flex items-center gap-2">
                       <FileIcon size={20} className="text-blue-400" />
                       <span className="text-xs text-gray-300 max-w-[100px] truncate">{att.fileName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text Bubble */}
          <div className={`
             ${isAI ? '' : 'bg-[#2f2f2f] text-gray-100 rounded-[2rem] px-5 py-3 shadow-sm'}
          `}>
            {/* Markdown Content */}
            <div className={`prose prose-invert max-w-none text-[15px] leading-7 break-words 
              ${isAI ? 'prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:border-none' : ''}
            `}>
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                  // Style paragraphs
                  p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                  // Style headings
                  h1: ({children}) => <h1 className="text-2xl font-semibold mb-4 text-white">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-medium mb-3 text-white">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-medium mb-2 text-blue-200">{children}</h3>,
                  ul: ({children}) => <ul className="list-disc pl-5 mb-4 space-y-1 marker:text-gray-500">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-5 mb-4 space-y-1 marker:text-gray-500">{children}</ol>,
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>

          {/* Copy Button (only for AI messages) */}
          {isAI && (
            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <button 
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;