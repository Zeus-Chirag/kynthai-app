'use client';

import * as React from 'react';
import {
  FlaskConical,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  TestTubeDiagonal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/kyntha/animations';

interface LabBooking {
  id: string;
  labName: string;
  tests: Array<{ name: string; price: number }>;
  scheduledAt: string;
  status: string;
  price: number;
  homeCollection: boolean;
}

interface LabResults {
  id: string;
  status: string;
  tests: Array<{ name: string; price: number }>;
  hasResultsFile: boolean;
  resultsNote: string | null;
  resultUploadedAt: string | null;
  labName: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  sample_collected: {
    label: 'Sample Collected',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: TestTubeDiagonal,
  },
  processing: {
    label: 'Processing',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
};

export function LabResultsViewer({ isDemo }: { isDemo: boolean }) {
  const { toast } = useToast();
  const [bookings, setBookings] = React.useState<LabBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [expandedResults, setExpandedResults] = React.useState<LabResults | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lab-bookings', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (bookingId: string) => {
    setDownloading(bookingId);
    try {
      const res = await fetch(`/api/lab-bookings/${bookingId}/results`);
      if (!res.ok) throw new Error('Failed to fetch results');
      const data: LabResults = await res.json();

      if (!data.hasResultsFile) {
        toast({
          title: 'No results file',
          description: 'Results have not been uploaded yet.',
        });
        return;
      }

      if (data.resultsNote) {
        setExpandedResults(data);
      } else {
        toast({
          title: 'Results available',
          description: 'Results file is ready. Contact your lab for a copy.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not load results. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading lab bookings…</span>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <FadeIn>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <FlaskConical className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">No lab bookings yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Book a lab test from the Care tab to see your results here.
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b, i) => {
        const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
        const StatusIcon = sc.icon;
        const isProcessing = b.status === 'processing';

        return (
          <FadeIn key={b.id} delay={i * 0.05}>
            <Card className="transition-all hover:shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.labName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.tests.map(t => t.name).join(', ') || 'Lab test'}
                      {b.homeCollection && ' · Home collection'}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px] shrink-0', sc.color)}
                  >
                    <StatusIcon
                      className={cn('h-3 w-3', isProcessing && 'animate-spin')}
                    />
                    {sc.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.scheduledAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs font-medium">
                    ${b.price}
                  </span>
                </div>

                {b.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => handleDownload(b.id)}
                    disabled={downloading === b.id}
                  >
                    {downloading === b.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" /> Download Results
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        );
      })}

      {expandedResults && (
        <FadeIn>
          <Card className="ring-1 ring-emerald-500/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold">Results — {expandedResults.labName}</p>
                <button
                  onClick={() => setExpandedResults(null)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              {expandedResults.resultsNote && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">
                  {expandedResults.resultsNote}
                </p>
              )}
              {expandedResults.resultUploadedAt && (
                <p className="text-[10px] text-muted-foreground">
                  Uploaded {new Date(expandedResults.resultUploadedAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
