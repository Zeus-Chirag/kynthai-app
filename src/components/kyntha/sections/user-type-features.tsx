'use client';

import React from 'react';
import { Pill, Stethoscope, Users, HeartPulse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoginPortal } from '@/lib/store';

function UserTypeFeatures({ onGetStarted }: { onGetStarted: (portal?: string) => void }) {
  const features = [
    {
      id: 'patient' as const,
      title: 'For Patients',
      subtitle: 'Take control of your health',
      icon: Pill,
      bullets: [
        'Track medications & adherence',
        'Book lab tests at home',
        'Health journal & trends',
      ],
      accent: 'from-emerald-500 to-emerald-700',
      portal: 'patient',
    },
    {
      id: 'doctor' as const,
      title: 'For Doctors',
      subtitle: 'Verified practitioners only',
      icon: Stethoscope,
      bullets: [
        'Patient management dashboard',
        'Secure video consults',
        'Digital prescriptions & notes',
      ],
      accent: 'from-teal-500 to-emerald-600',
      portal: 'doctor',
    },
    {
      id: 'caretaker' as const,
      title: 'For Families',
      subtitle: 'Care for everyone you love',
      icon: Users,
      bullets: ['Up to 4 member profiles', 'Real-time family alerts', 'Shared health reports'],
      accent: 'from-emerald-500 to-teal-600',
      portal: 'caretaker',
    },
    {
      id: 'caretaker-assist' as const,
      title: 'For Caretakers',
      subtitle: 'Coordinate care with ease',
      icon: HeartPulse,
      bullets: ['Missed-dose alert system', 'Care task tracking', 'Health monitoring dashboard'],
      accent: 'from-teal-500 to-teal-700',
      portal: 'caretaker',
    },
  ];

  return (
    <section
      aria-labelledby="features-user-type-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          Built for every role
        </Badge>
        <h2
          id="features-user-type-heading"
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          One platform. <span className="text-emerald-600">Four experiences.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Choose how you use Kyntha. Switch between portals anytime from your account settings.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {features.map(f => (
          <div key={f.id} className="flex h-full">
            <Card
              onClick={() => onGetStarted(f.portal)}
              className={cn(
                'group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden border p-6 transition-all duration-200',
                'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-900/5',
                f.id === 'caretaker'
                  ? 'border-emerald-500/30 hover:border-emerald-500/50'
                  : 'border-border/60 hover:border-emerald-500/25'
              )}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onGetStarted(f.portal);
                }
              }}
              aria-label={`Enter ${f.title} portal`}
            >
              {/* Decorative spotlight on the caretaker card */}
              {f.id === 'caretaker' && (
                <div
                  className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
                  aria-hidden="true"
                  style={{
                    background:
                      'radial-gradient(closest-side, rgba(16,185,129,0.5), transparent 70%)',
                  }}
                />
              )}
              <div
                className={cn(
                  'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110',
                  f.accent
                )}
                aria-hidden="true"
              >
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {f.subtitle}
                </p>
              </div>
              <ul className="flex-1 space-y-2.5">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-[13px]">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onGetStarted(f.portal);
                }}
                aria-label={`Enter ${f.title} portal`}
                className="mt-auto w-full rounded-full font-medium"
              >
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}

export { UserTypeFeatures };
