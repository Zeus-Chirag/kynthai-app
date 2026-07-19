'use client';

import { Stethoscope, Microscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DOCTOR_BASE_FEE_PCT, LAB_BASE_FEE_PCT } from '@/lib/commission';
import type { LoginPortal } from '@/lib/store';

export function Commission({ onPick }: { onPick: (p: LoginPortal) => void }) {
  return (
    <section id="features-anchor" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          For professionals
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Earn with Kyntha</h2>
        <p className="mt-3 text-muted-foreground">
          Transparent platform fees — no hidden cuts. You keep the lion&apos;s share.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">For Doctors</h3>
            </div>
            <div className="mt-5">
              <span className="bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-5xl font-bold text-transparent">
                {DOCTOR_BASE_FEE_PCT}%
              </span>
              <span className="ml-2 text-sm text-muted-foreground">platform fee</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Transparent fees on every consultation and medicine order routed through your
              practice.
            </p>
            <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
              You keep the majority of every earning — no hidden cuts.
            </p>
            <Button
              className="mt-5 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              onClick={() => onPick('doctor')}
            >
              Apply as a Doctor
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-card to-emerald-500/5">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                <Microscope className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">For Labs</h3>
            </div>
            <div className="mt-5">
              <span className="bg-gradient-to-br from-teal-600 to-emerald-700 bg-clip-text text-5xl font-bold text-transparent">
                {LAB_BASE_FEE_PCT}%
              </span>
              <span className="ml-2 text-sm text-muted-foreground">platform fee</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Transparent fees on every test booking fulfilled through Kyntha&apos;s network.
            </p>
            <p className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-muted-foreground">
              You keep the majority of every earning — no hidden cuts.
            </p>
            <Button
              className="mt-5 w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white"
              onClick={() => onPick('lab')}
            >
              Partner as a Lab
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
