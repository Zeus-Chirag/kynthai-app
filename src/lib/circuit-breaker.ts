/**
 * Circuit Breaker Pattern for External API Calls
 *
 * Prevents cascade failures when external services (Stripe, Supabase, OpenAI) are down.
 * Uses: failure threshold, timeout, and half-open state for recovery.
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening circuit
  successThreshold: number;      // Successes in half-open before closing
  timeout: number;              // ms before trying half-open
  name: string;                 // For logging/metrics
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttempt: number;
}

const breakers = new Map<string, CircuitBreakerState>();

export function getCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreakerState {
  if (!breakers.has(name)) {
    breakers.set(name, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
    });
  }
  return breakers.get(name)!;
}

export function resetCircuitBreaker(name: string): void {
  breakers.delete(name);
}

export async function withCircuitBreaker<T>(
  name: string,
  config: CircuitBreakerConfig,
  fn: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(name, config);
  const now = Date.now();

  // Check if we should attempt recovery (half-open)
  if (breaker.state === 'open') {
    if (now >= breaker.nextAttempt) {
      breaker.state = 'half-open';
      breaker.successes = 0;
    } else {
      throw new Error(`Circuit breaker ${name} is OPEN - failing fast`);
    }
  }

  try {
    const result = await fn();

    // Success handling
    if (breaker.state === 'half-open') {
      breaker.successes++;
      if (breaker.successes >= config.successThreshold) {
        breaker.state = 'closed';
        breaker.failures = 0;
      }
    } else if (breaker.state === 'closed') {
      breaker.failures = 0; // Reset on success
    }

    return result;
  } catch (error) {
    // Failure handling
    breaker.failures++;
    breaker.lastFailureTime = now;

    if (breaker.state === 'half-open') {
      // Any failure in half-open goes back to open
      breaker.state = 'open';
      breaker.nextAttempt = now + config.timeout;
    } else if (breaker.failures >= config.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttempt = now + config.timeout;
    }

    throw error;
  }
}

export function getCircuitBreakerStatus(name: string): CircuitBreakerState | null {
  return breakers.get(name) || null;
}

export function getAllCircuitBreakers(): Map<string, CircuitBreakerState> {
  return new Map(breakers);
}

// Pre-configured breakers for our external services
export const CIRCUIT_BREAKERS = {
  stripe: { failureThreshold: 5, successThreshold: 3, timeout: 30000, name: 'stripe' },
  supabase: { failureThreshold: 10, successThreshold: 5, timeout: 60000, name: 'supabase' },
  openai: { failureThreshold: 3, successThreshold: 2, timeout: 60000, name: 'openai' },
  upstash: { failureThreshold: 5, successThreshold: 3, timeout: 30000, name: 'upstash' },
} as const;

// Helper functions for common operations
export async function withStripeCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return withCircuitBreaker('stripe', CIRCUIT_BREAKERS.stripe, fn);
}

export async function withSupabaseCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return withCircuitBreaker('supabase', CIRCUIT_BREAKERS.supabase, fn);
}

export async function withOpenAICircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return withCircuitBreaker('openai', CIRCUIT_BREAKERS.openai, fn);
}

export async function withUpstashCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return withCircuitBreaker('upstash', CIRCUIT_BREAKERS.upstash, fn);
}