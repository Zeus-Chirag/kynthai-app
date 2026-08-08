'use client';

/**
 * Reticle dev registry — declares the app's testable surface (testids,
 * signals, stores) so the coding agent can verify flows against the real
 * running app without reading source. Dev-only; tree-shaken out of production.
 */
import { registerCapabilities } from '@reticlehq/react';

export function registerReticleCapabilities() {
  if (process.env.NODE_ENV !== 'development') return;
  registerCapabilities({
    testids: [
      // Auth
      'login-email',
      'login-password',
      'login-submit',
      'register-submit',
      // Patient meds
      'meds-list',
      'meds-search',
      'meds-add',
      // AI chat
      'ai-chat-input',
      'ai-chat-send',
      // Refunds / admin
      'refund-request-submit',
      'admin-tab-refunds',
      'fraud-block-form',
      'fraud-block-email',
    ],
    signals: [
      'auth:login',
      'auth:logout',
      'meds:loaded',
      'meds:added',
      'refund:submitted',
      'refund:approved',
      'fraud:blocked',
    ],
    stores: ['useAppStore'],
  });
}
