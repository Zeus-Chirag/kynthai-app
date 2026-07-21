'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

function FAQ() {
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: 'Is my health data safe?',
      a: 'Yes. Kyntha is designed with Privacy-first safeguards. Your data is encrypted at rest and in transit. We never sell your personal data. You can export or delete it anytime.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We support secure card payments, ACH, Apple Pay, and Google Pay. No UPI. All pricing is in USD with no hidden currency conversion.',
    },
    {
      q: 'Is it really free to start?',
      a: 'Yes. The Free tier includes 1 member profile, up to 10 medications, 5 AI chats per day, and all smart reminders. No credit card required. Upgrade only when you need more. The AI only answers health & medication questions — it will not respond to coding, homework, or non-health topics.',
    },
    {
      q: 'Are the doctors verified?',
      a: "Our admin team reviews every doctor's professional credentials before platform access. Checks typically include medical registration numbers, government-issued photo ID, and qualification documents. Approved doctors receive a platform badge confirming our review was completed. Verification status reflects our initial review only; individual doctors remain responsible for maintaining their own professional registration and licence with the relevant state medical council.",
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, cancel anytime with one tap in your profile. No questions asked.',
    },
    {
      q: 'Does it work for elderly family members?',
      a: 'Absolutely. Kyntha was designed for multi-generational American families. Clear in-app reminders, large text, and SOS alerts make it accessible for seniors. Caretakers get live alerts if a dose is missed.',
    },
    {
      q: "What if my doctor isn't on Kyntha?",
      a: 'You can still use all patient features — reminders, AI chat, symptom analyzer, medicine ID, drug interactions. Invite your doctor to join for free; they earn on every consult and medicine order routed through Kyntha.',
    },
  ];

  return (
    <section className="border-y border-border/60 bg-muted/30 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Frequently asked questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to know
          </h2>
          <p className="mt-3 text-muted-foreground">
            Still curious? Email us at{' '}
            <a
              href="mailto:hello@kyntha.app"
              className="font-medium text-emerald-600 hover:underline"
            >
              hello@kyntha.app
            </a>
            .
          </p>
        </div>

        <Card className="mt-10 p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="px-3 text-left text-base font-medium sm:text-[15px]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-sm leading-relaxed text-muted-foreground sm:text-[13.5px]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </section>
  );
}

export { FAQ };
