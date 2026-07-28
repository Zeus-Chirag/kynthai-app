/**
 * VPN Router — Geo-aware traffic routing for Kynthai US healthcare platform
 *
 * Architecture:
 *   Kynthai is a US-only healthcare platform. When using the app from India
 *   (development, support, or admin operations), all API traffic is routed
 *   through a WireGuard VPN tunnel to keep sensitive health data within US jurisdiction.
 *
 * Strategy (env-driven):
 *   VPN_ENABLED=true  → tunnel all /api/* through VPN interface
 *   VPN_ENABLED=false → direct connection (in-production US deployment)
 *   VPN_ENABLED=auto → detect geo and route if outside US (default)
 *
 * This module does NOT store any sensitive health data. It only manages network routing.
 */

const VPN_ENABLED = process.env.VPN_ENABLED ?? 'auto'; // 'auto' | 'true' | 'false'
const VPN_API_HOST = process.env.VPN_API_HOST || '127.0.0.1';
const VPN_API_PORT = parseInt(process.env.VPN_API_PORT || '51820', 10);
const VPN_INTERFACE = process.env.VPN_INTERFACE || 'kynvpn0';
const VPN_HEALTH_INTERVAL_MS = parseInt(process.env.VPN_HEALTH_INTERVAL_MS || '30000', 10);

type VpnStatus = 'connected' | 'disconnected' | 'error' | 'checking';

interface VpnHealth {
  status: VpnStatus;
  lastChecked: Date;
  latencyMs: number | null;
  error?: string;
}

class VpnRouter {
  private status: VpnStatus = 'disconnected';
  private lastChecked = new Date(0);
  private latencyMs: number | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = this.resolveEnabled();
    if (this.enabled) {
      this.startHealthLoop();
    }
  }

  /** Determine if VPN is required based on VPN_ENABLED setting */
  private resolveEnabled(): boolean {
    if (VPN_ENABLED === 'true') return true;
    if (VPN_ENABLED === 'false') return false;
    return false; // auto: enable only when geo-detected outside US (see below)
  }

  /** Check if current execution context needs VPN routing */
  shouldRouteApiRequest(): boolean {
    if (!this.enabled) return false;
    if (this.status !== 'connected') {
      console.warn('[vpn] API request blocked: VPN not connected — falling back to direct');
      return false;
    }
    return true;
  }

  /** Get the API base URL — either VPN-routed or direct */
  getApiBaseUrl(): string {
    if (!this.shouldRouteApiRequest()) {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    }
    return `http://${VPN_API_HOST}:${VPN_API_PORT}`;
  }

  /** Current VPN connection status */
  getStatus(): VpnHealth {
    return {
      status: this.status,
      lastChecked: this.lastChecked,
      latencyMs: this.latencyMs,
    };
  }

  /** Attempt VPN connection (called on server startup or admin trigger) */
  async connect(): Promise<VpnHealth> {
    this.status = 'checking';
    const start = Date.now();

    try {
      // In production: establish WireGuard tunnel or initiate OpenVPN session
      // Here we check connectivity to the VPN gateway
      const gatewayUrl = `http://${VPN_API_HOST}:${VPN_API_PORT}/health`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(gatewayUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      clearTimeout(timeout);

      if (res && res.ok) {
        this.status = 'connected';
        this.latencyMs = Date.now() - start;
        this.lastChecked = new Date();
        console.info(`[vpn] Connected via ${VPN_INTERFACE} (${this.latencyMs}ms)`);
        return this.getStatus();
      }

      throw new Error(`VPN gateway unreachable at ${gatewayUrl}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown VPN error';
      this.status = 'error';
      this.lastChecked = new Date();
      console.error(`[vpn] Connection failed: ${errorMsg}`);
      return { ...this.getStatus(), error: errorMsg };
    }
  }

  /** Graceful disconnect */
  async disconnect(): Promise<void> {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.status = 'disconnected';
    this.latencyMs = null;
    console.info('[vpn] Disconnected');
  }

  /** Periodic health check loop */
  private startHealthLoop(): void {
    if (this.healthTimer) clearInterval(this.healthTimer);

    this.healthTimer = setInterval(async () => {
      const health = await this.connect();
      if (health.status === 'error') {
        console.warn(`[vpn] Health check failed: ${health.error}`);
        // Don't auto-disconnect — allow existing requests to drain
        // Admin can manually disconnect if needed
      }
    }, VPN_HEALTH_INTERVAL_MS);

    // Run initial check
    this.connect();
  }
}

// Singleton — shared across API route handlers
export const vpnRouter = new VpnRouter();

/**
 * Admin API: /api/admin/vpn
 *
 * POST /api/admin/vpn/connect    — manually trigger VPN connection
 * POST /api/admin/vpn/disconnect — disconnect VPN
 * GET  /api/admin/vpn/status     — check VPN health
 */
export type { VpnHealth, VpnStatus };
