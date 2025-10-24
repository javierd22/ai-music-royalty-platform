/**
 * Types for Royalty Events and Matches
 *
 * Per PRD Section 5.4: Royalty Event Engine
 */

export interface RoyaltyEvent {
  id: string;
  track_id: string;
  result_id: string | null;
  ai_use_log_id: string | null;
  event_type: string;
  similarity: number;
  match_confidence: number | null;
  payout_weight: number;
  amount: number; // in USD (float)
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  verified_at: string;
  approved_at: string | null;
  paid_at: string | null;
  metadata: RoyaltyEventMetadata | null;
  created_at: string;
  updated_at: string | null;
}

export interface RoyaltyEventMetadata {
  track_title?: string;
  artist?: string;
  model_id?: string;
  sdk_confidence?: number;
  duration_seconds?: number;
  model_tier?: string;
  verification_note?: string;
  [key: string]: any;
}

export interface RoyaltyEventWithTrack extends RoyaltyEvent {
  track?: {
    title: string;
    artist: string;
  } | null;
}

export interface Result {
  id: string;
  track_id: string;
  source_file: string;
  similarity: number;
  percent_influence: number;
  created_at: string;
  user_id: string | null;
  metadata: ResultMetadata | null;
}

export interface ResultMetadata {
  track_title?: string;
  artist?: string;
  embedding_model?: string;
  [key: string]: any;
}

export interface Match {
  trackTitle: string;
  artist: string;
  similarity: number;
  percentInfluence: number;
}

export interface ResultWithMatches extends Result {
  matches?: Match[];
}

export interface RoyaltySummary {
  totalEvents: number;
  totalPayoutCents: number;
  avgConfidence: number;
  pendingEvents: number;
  paidEvents: number;
}

export interface RoyaltyFilters {
  dateFrom?: string;
  dateTo?: string;
  minConfidence?: number;
  status?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedRoyaltyEvents {
  events: RoyaltyEventWithTrack[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
