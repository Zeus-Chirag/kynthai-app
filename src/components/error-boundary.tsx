"use client";
import { Component, createContext, ReactNode, useContext } from "react";

interface ErrorBoundaryContextValue {
  error: Error | null;
  reset: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue>({
  error: null,
  reset: () => {},
});

export function useErrorBoundary(): ErrorBoundaryContextValue {
  return useContext(ErrorBoundaryContext);
}

interface FallbackProps {
  error: Error;
  reset: () => void;
  isDev: boolean;
  errorInfo?: string;
}

const LABELS = {
  devTitle: "Something broke in development 🙈",
  prodTitle: "Kuch gadbad ho gayi 🙏",
  devMsg: "An unexpected error occurred. Check the details below.",
  prodMsg:
    "Koi chhoti si problem aa gayi hai. Thoda time lein aur phir se try karein — sab theek ho jayega!",
  tryAgain: "↩ Phir se Try karein",
  devTryAgain: "Try Again",
  reload: "🔄 Reload Page",
  errorLabel: "Error:",
  compStack: "🔍 Component Stack (dev only)",
  devFooter: (name: string) => `Error name: ${name} | Stack available in component stack above.`,
};

// ─── Default Fallback UI ──────────────────────────────────────────────────────
function ErrorFallbackUI({ error, reset, isDev, errorInfo }: FallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem", backgroundColor: "#fef2f2", color: "#7f1d1d",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "480px", width: "100%", textAlign: "center",
        backgroundColor: "#fff", borderRadius: "1rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
        padding: "2.5rem 2rem" }}>
        <div aria-hidden="true" style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🙏</div>
        <h1 style={{
          fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem",
          color: "#991b1b", lineHeight: 1.3,
        }}>
          {isDev ? LABELS.devTitle : LABELS.prodTitle}
        </h1>
        <p style={{ fontSize: "1rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          {isDev ? LABELS.devMsg : LABELS.prodMsg}
        </p>
        <div aria-label="Error message" style={{
          textAlign: "left", backgroundColor: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.5rem",
          fontSize: "0.875rem", wordBreak: "break-word", color: "#991b1b",
        }}>
          <strong>{LABELS.errorLabel}</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, monospace" }}>
            {error.message || "Unknown error"}
          </span>
        </div>
        {isDev && errorInfo && (
          <details style={{ marginBottom: "1.5rem", textAlign: "left" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "#b91c1c",
              marginBottom: "0.75rem", userSelect: "none" }}>{LABELS.compStack}</summary>
            <pre aria-label="Component stack trace" style={{
              backgroundColor: "#1f2937", color: "#9ca3af", padding: "1rem",
              borderRadius: "0.5rem", fontSize: "0.75rem", overflow: "auto",
              maxHeight: "200px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{errorInfo}</pre>
          </details>
        )}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={reset} style={{
            backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.75rem",
            padding: "0.75rem 1.75rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer",
          }}>
            {isDev ? LABELS.devTryAgain : LABELS.tryAgain}
          </button>
          <button onClick={() => window.location.reload()} style={{
            backgroundColor: "transparent", color: "#374151", border: "2px solid #d1d5db",
            borderRadius: "0.75rem", padding: "0.75rem 1.75rem", fontSize: "1rem",
            fontWeight: 600, cursor: "pointer",
          }}>{LABELS.reload}</button>
        </div>
        {isDev && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
            {LABELS.devFooter(error.name)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ErrorBoundary class ──────────────────────────────────────────────────────
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: FallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack?: string }) => void;
  extraInfo?: Record<string, unknown>;
}

interface _State {
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, _State> {
  public state: _State = { error: null, errorInfo: null };
  private _extraInfo?: Record<string, unknown>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this._extraInfo = props.extraInfo;
  }

  static getDerivedStateFromError(error: Error): _State {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    const payload = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
      ...this._extraInfo,
    };
    console.error("[ErrorBoundary]", payload);

    try {
      // @ts-ignore
      if (typeof window !== "undefined" && (window as any)?.Sentry) {
        // @ts-ignore
        (window as any).Sentry?.captureException?.(error, {
          tags: { component: "kyntha-app" },
          contexts: { extra: payload },
        });
      }
    } catch { /* Sentry absent */ }

    this.props.onError?.(error, info);
  }

  reset = (): void => this.setState({ error: null, errorInfo: null });

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { error } = this.state;

    if (error) {
      const ui = fallback
        ? fallback({ error, reset: this.reset, isDev: process.env.NODE_ENV === "development" })
        : <ErrorFallbackUI error={error} reset={this.reset} isDev={process.env.NODE_ENV === "development"} />;

      return (
        <ErrorBoundaryContext.Provider value={{ error, reset: this.reset }}>
          {ui}
        </ErrorBoundaryContext.Provider>
      );
    }

    return (
      <ErrorBoundaryContext.Provider value={{ error: null, reset: this.reset }}>
        {children}
      </ErrorBoundaryContext.Provider>
    );
  }
}

// ─── ErrorProvider functional wrapper ────────────────────────────────────────
export interface ErrorProviderProps {
  children: ReactNode;
  fallback?: (props: FallbackProps) => ReactNode;
  onError?: ErrorBoundaryProps["onError"];
  extraInfo?: ErrorBoundaryProps["extraInfo"];
}

export function ErrorProvider({
  children, fallback, onError, extraInfo,
}: ErrorProviderProps) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError} extraInfo={extraInfo}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
