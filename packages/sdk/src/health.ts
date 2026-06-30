import { rpc } from "@stellar/stellar-sdk";

export type ConnectionStatus = "connected" | "disconnected";
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;

export interface HealthCheckConfig {
  /** Interval in ms between health checks. Default: 30000 */
  intervalMs?: number;
  /** Initial backoff in ms for reconnection attempts. Default: 1000 */
  backoffMs?: number;
  /** Maximum backoff cap in ms. Default: 30000 */
  maxBackoffMs?: number;
}

/**
 * Manages periodic RPC health checks, emits connected/disconnected events,
 * and retries with exponential backoff on disconnect.
 */
export class ConnectionHealthMonitor {
  private readonly rpcUrl: string;
  private readonly intervalMs: number;
  private readonly backoffMs: number;
  private readonly maxBackoffMs: number;

  private status: ConnectionStatus = "disconnected";
  private listeners: ConnectionStatusCallback[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(rpcUrl: string, config: HealthCheckConfig = {}) {
    this.rpcUrl = rpcUrl;
    this.intervalMs = config.intervalMs ?? 30_000;
    this.backoffMs = config.backoffMs ?? 1_000;
    this.maxBackoffMs = config.maxBackoffMs ?? 30_000;
  }

  /** Register a callback invoked whenever connection status changes. Starts the loop if not already running. */
  onConnectionStatusChange(callback: ConnectionStatusCallback): void {
    this.listeners.push(callback);
    this.start();
  }

  /** Perform a single health check ping against the RPC endpoint. */
  async healthCheck(): Promise<boolean> {
    try {
      const server = new rpc.Server(this.rpcUrl);
      await server.getLatestLedger();
      return true;
    } catch {
      return false;
    }
  }

  /** Start periodic health checks. Idempotent — safe to call multiple times. */
  start(): void {
    if (this.timer !== null) return; // already running
    this.stopped = false;
    this.scheduleCheck(0);
  }

  /** Stop all periodic checks and clear timers. */
  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleCheck(delayMs: number): void {
    this.timer = setTimeout(() => this.runCheck(), delayMs);
  }

  private async runCheck(): Promise<void> {
    if (this.stopped) return;

    const ok = await this.healthCheck();
    const next: ConnectionStatus = ok ? "connected" : "disconnected";

    if (next !== this.status) {
      this.status = next;
      for (const cb of this.listeners) cb(this.status);
    }

    if (!this.stopped) {
      this.scheduleCheck(ok ? this.intervalMs : this.nextBackoff());
    }
  }

  private _currentBackoff = 0;

  private nextBackoff(): number {
    if (this._currentBackoff === 0) {
      this._currentBackoff = this.backoffMs;
    } else {
      this._currentBackoff = Math.min(this._currentBackoff * 2, this.maxBackoffMs);
    }
    return this._currentBackoff;
  }
}
