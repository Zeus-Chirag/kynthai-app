'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MessageSquareText, X, Sparkles, Bug, Lightbulb, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type FeedbackCategory = 'bug' | 'feature' | 'general';

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'bug', label: 'Bug Report', icon: Bug },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb },
  { value: 'general', label: 'General', icon: Sparkles },
];

/**
 * FeedbackWidget — floating action button that opens a feedback dialog.
 * Use once at the app root or in each portal layout.
 */
export function FeedbackWidget() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [category, setCategory] = React.useState<FeedbackCategory>('general');
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: email || 'anonymous@kynthai.app',
          category,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }

      toast({ title: 'Feedback sent!', description: 'Thank you for helping us improve.' });
      setOpen(false);
      setMessage('');
      setCategory('general');
    } catch (err) {
      toast({
        title: 'Could not send',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg',
              'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
              'hover:from-emerald-600 hover:to-teal-700',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
            )}
            aria-label="Send feedback"
          >
            <MessageSquareText className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Feedback dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-emerald-600" />
              Send Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve Kynthai. Found a bug? Have a feature idea? Let us know.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-all',
                        active
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-border hover:border-emerald-500/40 text-muted-foreground',
                      )}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-emerald-600' : '')} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-message">Message</Label>
              <Textarea
                id="fb-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe what happened or what you'd like to see..."
                rows={4}
                required
                className="resize-none"
              />
            </div>

            {/* Email (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="fb-email">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="fb-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="For follow-up if needed"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !message.trim()}
                className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
