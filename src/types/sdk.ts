/**
 * Types for AI Partner SDK Logs
 * Per PRD Section 5.2: AI Partner SDK
 */

import type { DualProofStatus } from '@/lib/dualProof';

export interface SdkLog {
  id: string;
  model_id: string;
  track_id: string;
  prompt: string | null;
  confidence: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string | null;
}

export interface SdkLogWithTrack extends SdkLog {
  track?: {
    title: string;
    artist?: string;
  } | null;
}

export interface SdkLogWithDualProof extends SdkLogWithTrack {
  dual_proof_status: DualProofStatus;
  result_id?: string | null;
  royalty_event_id?: string | null;
}

export interface SdkLogFilters {
  trackId?: string;
  modelId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedSdkLogs {
  logs: SdkLogWithDualProof[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
