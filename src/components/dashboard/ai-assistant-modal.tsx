'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  TrendingUp, 
  MessageSquare, 
  Scissors, 
  Check, 
  Copy,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  sender: 'ai' | 'user';
  text: string;
}

const QUICK_PROMPTS = [
  { label: '📊 Revenue & Business Summary', prompt: 'Give me a summary of today revenue, top stylist, and growth tips.' },
  { label: '💬 Draft Client WhatsApp Promo', prompt: 'Write a warm WhatsApp promotion message for a weekend hair spa and keratin offer.' },
  { label: '✂️ Treatment Recommendation', prompt: 'What treatment should I recommend to a client with dry, bleached, and frizzy hair?' },
];

export function AIAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I'm your **SalonFlow AI Assistant**, powered by **Google AI Studio** & Gemini. How can I help boost your salon today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });
      const data = await res.json();
      
      const aiReply: Message = {
        sender: 'ai',
        text: data.response || "Here's my analysis for your salon.",
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I could not reach the Google AI service. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to Clipboard' });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-xs shadow-xl shadow-purple-600/30 transition-all hover:scale-105 select-none"
      >
        <Sparkles className="w-4 h-4 animate-spin-slow" />
        <span>SalonFlow AI</span>
      </button>

      {/* AI Assistant Chat Drawer/Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[400px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">SalonFlow AI</h3>
                <span className="text-[10px] text-purple-200 font-medium">Powered by Google AI Studio</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-purple-50/60 border-b border-purple-100/80 flex items-center gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-xl bg-white border border-purple-200/80 hover:bg-purple-100/50 text-[10px] font-semibold text-purple-800 whitespace-nowrap shadow-2xs transition-all shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`relative group max-w-[82%] p-3 rounded-2xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-700 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                  {msg.sender === 'ai' && (
                    <button
                      type="button"
                      onClick={() => copyText(msg.text)}
                      className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs hover:bg-slate-50 transition-opacity"
                      title="Copy response"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="h-6 w-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-purple-700 font-medium text-xs pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Google AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask SalonFlow AI anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-9 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-9 w-9 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white flex items-center justify-center shadow-xs transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
