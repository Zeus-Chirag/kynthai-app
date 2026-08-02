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
      reset: (widgetId: string) => void;
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

export interface TurnstileWidgetHandle {
  /** Reset the widget in place and clear any minted token state. */
  reset: () => void;
  /**
   * Reset the widget and resolve with a freshly minted token.
   *
   * Turnstile tokens are single-use — the server consumes them on every
   * siteverify call. Call `mint()` before re-submitting a form that already
   * failed (or between chained requests like register → auto-login) so the
   * next request never replays a consumed token (which fails with
   * `timeout-or-duplicate`). Best-effort: if the widget cannot re-issue
   * within 8s, it resolves with the last known token so the flow degrades
   * gracefully instead of hanging.
   */
  mint: () => Promise<string>;
}

/**
 * Renders a Cloudflare Turnstile human-verification widget.
 *
 * - Script is loaded once, lazily, and only when this component mounts.
 * - Callbacks are kept in refs so parent re-renders never re-create the widget.
 * - The effect depends only on `siteKey`/`theme`; unmount removes the iframe.
 * - Exposes an imperative handle (`reset` / `mint`) for single-use-token flows.
 */
export const TurnstileWidget = React.forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onToken, onExpire, theme = 'auto' }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);
    const lastTokenRef = React.useRef<string | null>(null);
    const mintResolveRef = React.useRef<((t: string) => void) | null>(null);
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
            callback: (token: string) => {
              lastTokenRef.current = token;
              onTokenRef.current(token);
              const resolve = mintResolveRef.current;
              mintResolveRef.current = null;
              resolve?.(token);
            },
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

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          setFailed(false);
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              // Best-effort reset.
            }
          }
        },
        mint: () =>
          new Promise<string>((resolve) => {
            const fallbackTimer = window.setTimeout(() => {
              mintResolveRef.current = null;
              resolve(lastTokenRef.current ?? '');
            }, 8000);

            mintResolveRef.current = (token: string) => {
              window.clearTimeout(fallbackTimer);
              resolve(token);
            };

            // Reset the widget — non-interactive challenges re-issue silently,
            // interactive ones ask the user to re-check. Either way the
            // callback eventually fires with a fresh token.
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                window.clearTimeout(fallbackTimer);
                mintResolveRef.current = null;
                resolve(lastTokenRef.current ?? '');
              }
            } else {
              // Widget not rendered (script blocked / never mounted) — degrade.
              window.clearTimeout(fallbackTimer);
              mintResolveRef.current = null;
              resolve(lastTokenRef.current ?? '');
            }
          }),
      }),
      []
    );

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
);
