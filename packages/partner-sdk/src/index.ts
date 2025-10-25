export interface SDKConfig {
  baseUrl: string;
  apiKey: string;
}

export interface SessionConfig {
  generatorId: string;
  model: string;
  promptHash: string;
}

export interface UseEvent {
  trackId?: string;
  startMs: number;
  endMs: number;
  strength: number;
}

export interface ManifestPreview {
  event_id: string;
  generator_id: string;
  model: string;
  prompt_hash: string;
  track_id?: string;
  created_at: string;
  manifest_version: string;
}

export class PartnerSDK {
  private config: SDKConfig | null = null;
  private sessionId: string | null = null;

  init(config: SDKConfig): void {
    this.config = config;
  }

  async startSession(sessionConfig: SessionConfig): Promise<void> {
    if (!this.config) {
      throw new Error('SDK not initialized. Call init() first.');
    }

    this.sessionId = crypto.randomUUID();

    const response = await fetch(`${this.config.baseUrl}/api/sdk/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        type: 'session_start',
        sessionId: this.sessionId,
        ...sessionConfig,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start session: ${response.statusText}`);
    }
  }

  async logUse(useEvent: UseEvent): Promise<ManifestPreview> {
    if (!this.config || !this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    const response = await fetch(`${this.config.baseUrl}/api/sdk/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        type: 'use_event',
        sessionId: this.sessionId,
        ...useEvent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to log use: ${response.statusText}`);
    }

    return await response.json();
  }

  async endSession(): Promise<void> {
    if (!this.config || !this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }

    const response = await fetch(`${this.config.baseUrl}/api/sdk/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        type: 'session_end',
        sessionId: this.sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to end session: ${response.statusText}`);
    }

    this.sessionId = null;
  }
}

// Create and export a singleton instance
export const partnerSDK = new PartnerSDK();
export default partnerSDK;
