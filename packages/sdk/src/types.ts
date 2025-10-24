/**
 * Type definitions for AI Music Royalty Attribution Platform SDK
 *
 * Per PRD Section 4: Provenance SDK types
 */

export interface C2PAManifest {
  version: string;
  claim_generator: string;
  claim_generator_info: {
    name: string;
    version: string;
  };
  assertions: Array<{
    label: string;
    data: any;
  }>;
  signature: {
    algorithm: string;
    public_key: string;
    value: string;
  };
}

export interface GenerationMetadata {
  session_id?: string;
  output_id?: string;
  user_id?: string;
  model_version?: string;
  generation_params?: Record<string, any>;
}

export interface AttributionResult {
  trackId: string;
  confidence: number;
  similarity: number;
  percentInfluence: number;
  verified: boolean;
}

export interface SDKError extends Error {
  code: string;
  statusCode?: number;
}
