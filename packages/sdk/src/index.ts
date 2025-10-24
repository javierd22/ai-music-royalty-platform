/**
 * AI Music Royalty Attribution Platform SDK
 *
 * Per PRD Section 4: Provenance SDK
 * - beginGeneration() + endGeneration() hooks emit signed C2PA manifests
 * - Captures track IDs, timestamps, and licensed dataset references
 * - Lightweight integration (<50 ms latency target)
 *
 * Compliance: EU AI Act, C2PA provenance standards
 */

import axios, { AxiosError, AxiosInstance } from 'axios';

export interface GenerationConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface GenerationEvent {
  generatorId: string;
  trackId: string;
  prompt?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface GenerationResponse {
  id: string;
  manifestUrl: string;
  createdAt: string;
}

export class AIMusicSDK {
  private client: AxiosInstance;
  private config: GenerationConfig;

  constructor(config: GenerationConfig) {
    this.config = {
      baseUrl: 'http://localhost:8001',
      timeout: 5000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
    });
  }

  /**
   * Begin a generation event with retry logic and idempotency
   * Per PRD Section 4: Captures track IDs, timestamps, and licensed dataset references
   */
  async beginGeneration(event: GenerationEvent): Promise<GenerationResponse> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const idempotencyKey =
          event.idempotencyKey || `${event.generatorId}-${event.trackId}-${Date.now()}`;

        const response = await this.client.post(
          '/api/events/start',
          {
            generator_id: event.generatorId,
            track_id: event.trackId,
            start_time: new Date().toISOString(),
            prompt: event.prompt,
            confidence: event.confidence,
            metadata: event.metadata,
            idempotency_key: idempotencyKey,
          },
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        );

        return {
          id: response.data.id,
          manifestUrl: response.data.manifest_url,
          createdAt: response.data.created_at,
        };
      } catch (error) {
        const axiosError = error as AxiosError;

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to begin generation after ${maxRetries} attempts: ${axiosError.message}`
          );
        }

        // Retry on network errors or 5xx status codes
        if (
          axiosError.code === 'ECONNABORTED' ||
          (axiosError.response?.status && axiosError.response.status >= 500)
        ) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        // Don't retry on client errors (4xx)
        throw new Error(`Failed to begin generation: ${axiosError.message}`);
      }
    }

    throw new Error('Unexpected error in beginGeneration');
  }

  /**
   * End a generation event and emit C2PA manifest
   * Per PRD Section 4: Emits signed C2PA manifests
   */
  async endGeneration(
    generationId: string,
    outputMetadata?: Record<string, any>
  ): Promise<{ manifestUrl: string }> {
    try {
      const response = await this.client.post('/api/events/end', {
        generation_id: generationId,
        end_time: new Date().toISOString(),
        output_metadata: outputMetadata,
      });

      return {
        manifestUrl: response.data.manifest_url,
      };
    } catch (error) {
      throw new Error(`Failed to end generation: ${error}`);
    }
  }

  /**
   * Get generation logs for a track
   */
  async getGenerationLogs(trackId: string, limit = 50): Promise<any[]> {
    try {
      const response = await this.client.get('/api/events/logs', {
        params: { track_id: trackId, limit },
      });
      return response.data.logs;
    } catch (error) {
      throw new Error(`Failed to get generation logs: ${error}`);
    }
  }
}

// Export default instance factory
export function createSDK(config: GenerationConfig): AIMusicSDK {
  return new AIMusicSDK(config);
}

// Export types
export * from './types';
