'use client';

import * as React from 'react';

/**
 * Minimal typed surface for the Cloudflare Turnstile global.
 * (Loaded lazily from challenges.cloudflare.com — never bundled.)
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-loader';

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.turnstile) return resolve();

    const waitForTurnstile = () => {
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 80);
      // Safety: give up after 10s rather than hanging the form forever.
      setTimeout(() => clearInterval(poll), 10_000);
    };

    if (document.getElementById(SCRIPT_ID)) {
      waitForTurnstile();
      return;
    }

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = waitForTurnstile;
    s.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(s);
  });
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Renders a Cloudflare Turnstile human-verification widget.
 *
 * - Script is loaded once, lazily, and only when this component mounts.
 * - Callbacks are kept in refs so parent re-renders never re-create the widget.
 * - The effect depends only on `siteKey`/`theme`; unmount removes the iframe.
 */
export function TurnstileWidget({ siteKey, onToken, onExpire, theme = 'auto' }: TurnstileWidgetProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Latest callbacks in refs → stable widget across parent re-renders.
  // (Updated in an effect, never during render — react-hooks/refs.)
  const onTokenRef = React.useRef(onToken);
  const onExpireRef = React.useRef(onExpire);
  React.useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  });

  React.useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          'error-callback': () => {
            onExpireRef.current?.();
            if (!cancelled) setFailed(true);
          },
          theme,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Best-effort cleanup.
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  return (
    <div className="space-y-1.5">
      <div
        ref={containerRef}
        className="flex min-h-[65px] items-center justify-center"
        aria-label="Human verification"
      />
      {failed && (
        <p className="text-center text-xs text-destructive" role="alert">
          Security check failed to load. Refresh the page and try again.
        </p>
      )}
    </div>
  );
}
