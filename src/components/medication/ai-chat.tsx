'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Bot, User, Trash2, Sparkles, ChevronDown, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MedicalDisclaimer } from '@/components/kynthai/medical-disclaimer';
import { useAppStore } from '@/lib/store';
import { getMedicineFromDb } from '@/lib/medicine-db-cache';
import ReactMarkdown from 'react-markdown';
import { safeAIResponse } from '@/lib/ai-output-filter';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PaginatedChatResponse {
  messages: ChatMsg[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Format medicine DB info into readable markdown (used in demo mode, $0 cost). */
function formatMedicineInfoLocal(med: NonNullable<ReturnType<typeof getMedicineFromDb>>): string {
  // ponytail: defensive — the medicine DB has rows with one or more of
  // commonUses / sideEffects / foodInteractions null. Map over them safely
  // so a single bad row doesn't take down the whole AI tab.
  const commonUses = med.commonUses ?? [];
  const sideEffects = med.sideEffects ?? [];
  const foodInteractions = med.foodInteractions ?? [];
  return `## ${med.name}${med.genericName ? ` (${med.genericName})` : ''}

**Category:** ${med.category}

### Common Uses
${commonUses.map((u: string) => `- ${u}`).join('\n')}

### Dosage
${med.dosage}

### How to Take
${med.timing}

### Common Side Effects
${sideEffects.map((s: string) => `- ${s}`).join('\n')}

### Food Interactions
${foodInteractions.map((f: string) => `- ${f}`).join('\n')}

### Pregnancy Safety
${med.pregnancySafety}

### Storage
${med.storage}

---
⚠️ **This is general information from our medicine database, not medical advice. Always consult a qualified healthcare professional.**`;
}

const SUGGESTIONS = [
  'What are common side effects of Metformin?',
  'How do I remember to take my pills on time?',
  'Can I take Vitamin D with food?',
  'What foods should I avoid while on blood pressure medication?',
];

// Context-aware quick replies shown after the first AI message
const QUICK_REPLIES = [
  {
    label: 'Side effects',
    query: 'What side effects should I watch for with my current medications?',
  },
  { label: 'Diet tips', query: 'What foods should I eat or avoid based on my medications?' },
  { label: 'When to see a doctor', query: 'When should I call my doctor vs. wait it out?' },
  {
    label: 'Drug interactions',
    query: 'Are there any interactions between my current medications?',
  },
  { label: 'Lab results', query: 'How do I understand my recent lab results?' },
  { label: 'Sleep tips', query: 'How can I improve my sleep quality?' },
];

export function AiChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const { toast } = useToast();
  const { user } = useAppStore();
  const isDemo = !!user?.isDemo;

  const loadMessages = async (cursor?: string) => {
    const url = cursor ? `/api/chat?cursor=${encodeURIComponent(cursor)}` : '/api/chat';
    const res = await fetch(url);
    if (!res.ok) return;
    const data: PaginatedChatResponse = await res.json();
    if (cursor) {
      // Prepend older messages
      setMessages(prev => [...prev, ...data.messages]);
      setOldestCursor(data.nextCursor);
    } else {
      setMessages(data.messages);
      setOldestCursor(data.nextCursor);
    }
    setHasMore(data.hasMore);
  };

  // Load older messages when user scrolls to top
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && oldestCursor) {
          setLoadingMore(true);
          loadMessages(oldestCursor).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, oldestCursor]);

  useEffect(() => {
    // Demo mode: skip API call, show welcome immediately
    if (isDemo) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hi! I'm **Kynthai**, your AI health & medication assistant. I'm here to help you understand your medicines, manage side effects, and feel confident about your health.\n\n**How can I help you today?** Try asking about:\n• Any medicine you're taking\n• Side effects you're experiencing\n• Food or drink interactions\n• When to take your medications",
        },
      ]);
      return;
    }

    // Real user: load paginated history from API
    setLoadingInitial(true);
    setLoadError(false);
    loadMessages()
      .catch(() => {
        setLoadError(true);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm **Kynthai**, your AI medication assistant. How can I help you today?",
          },
        ]);
      })
      .finally(() => setLoadingInitial(false));
  }, [isDemo]);

  // Show quick replies after first assistant message
  useEffect(() => {
    const hasAssistantMsg = messages.some(m => m.role === 'assistant' && m.id !== 'welcome');
    setShowQuickReplies(hasAssistantMsg && messages.length <= 3);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    // ── Demo mode: answer from medicine DB locally ($0 API cost) ──
    if (isDemo) {
      const medInfo = getMedicineFromDb(content);
      if (medInfo) {
        const reply = formatMedicineInfoLocal(medInfo);
        setMessages([
          ...nextMessages,
          { id: `a-${Date.now()}`, role: 'assistant', content: reply },
        ]);
      } else {
        setMessages([
          ...nextMessages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content:
              'I\'m Kynthai, your **health & medication** assistant. I\'m here to help you understand your medicines, manage your health, and feel confident about your care.\n\n**In this demo, I can help with 20+ common medicines** including Metformin, Atorvastatin, Amoxicillin, Omeprazole, Losartan, Aspirin, Levothyroxine, and more.\n\nTry asking me things like:\n• "What is Metformin used for?"\n• "What are the side effects of Atorvastatin?"\n• "Can I take Aspirin with food?"\n\nFor full capabilities — symptom analysis, drug interactions, and personalized health advice — create your free account. Your health journey starts here. 💚',
          },
        ]);
      }
      setSending(false);
      return;
    }

    // ── Real user: call the API ──
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.response,
        },
      ]);
    } catch (e) {
      toast({
        title: 'Failed to get response',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch('/api/chat', { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation cleared. What would you like to ask?',
      },
    ]);
    setHasMore(false);
    setOldestCursor(null);
  };

  return (
    <Card className="flex flex-col h-[70vh] min-h-[28rem]">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Kynthai Assistant</p>
              <p className="text-xs text-muted-foreground">AI-powered medication Q&amp;A</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="mailto:hello@kynthai.app?subject=Talk+to+Human"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              title="Need to talk to a human? Email our support team"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Talk to human</span>
            </a>
            <Button size="icon" variant="ghost" onClick={clearChat} title="Clear conversation">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll pr-3 min-h-0">
          <div className="space-y-3 pb-2">
            {/* Sentinel for infinite scroll upward */}
            <div ref={topSentinelRef} className="h-1" />

            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (oldestCursor && !loadingMore) {
                      setLoadingMore(true);
                      loadMessages(oldestCursor).finally(() => setLoadingMore(false));
                    }
                  }}
                  disabled={loadingMore || !oldestCursor}
                  className="text-xs text-muted-foreground"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  {loadingMore ? 'Loading...' : 'Load older messages'}
                </Button>
              </div>
            )}

            {loadingInitial && messages.length === 0 && !isDemo && !loadError
              ? [0, 1, 2].map(i => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 animate-pulse">
                      <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                    </div>
                  </div>
                ))
              : messages.map(m => <MessageBubble key={m.id} msg={m} />)}
            {sending && (
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI limits explainer */}
        <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/30">
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">
            What I can & can't do
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
            ✓ Answer questions about your medications, side effects, and interactions.
            ✓ Help you understand test results and health topics.
            ✗ Diagnose conditions — always check with your doctor.
            ✗ Replace professional medical advice or prescriptions.
          </p>
        </div>

        {/* Initial suggestions (before first message) */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 py-3">
            {SUGGESTIONS.map(s => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                className="text-xs h-auto py-1.5"
                onClick={() => send(s)}
              >
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                {s}
              </Button>
            ))}
          </div>
        )}

        {/* Quick replies (after first exchange) */}
        {showQuickReplies && (
          <div className="flex flex-wrap gap-2 py-2">
            {QUICK_REPLIES.map(q => (
              <Button
                key={q.label}
                size="sm"
                variant="secondary"
                className="text-[11px] h-auto py-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                onClick={() => send(q.query)}
              >
                {q.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 pt-3 border-t">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 2000))} // 2000 char limit for AI safety
              placeholder="Ask about your medications..."
              maxLength={2000}
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <Button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="bg-primary"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          I'm an AI assistant — not a doctor. For medical concerns, email{' '}
          <a href="mailto:hello@kynthai.app" className="text-emerald-600 hover:underline">hello@kynthai.app</a>
          {' '}or call 911 in an emergency.
        </p>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            <ReactMarkdown>{safeAIResponse(msg.content)}</ReactMarkdown>
          </div>
        )}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              AI
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
