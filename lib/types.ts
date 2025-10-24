export type Track = {
  id: string;
  title: string;
  storage_url: string;
  created_at: string;
};

export type Match = {
  trackTitle: string;
  artist: string;
  similarity: number; // 0 to 1
  percentInfluence: number; // 0 to 100
};

export type Result = {
  id: string;
  track_id: string;
  matches: Match[];
  created_at: string;
};

export type SdkUseSlip = {
  id: string;
  partner_id: string | null;
  track_id: string | null;
  model: string | null;
  event: 'begin' | 'end' | 'reference';
  payload: Record<string, unknown>;
  created_at: string;
};

export type RoyaltyEvent = {
  id: string;
  track_id: string; // PRD requires track linkage
  amount_cents: number;
  currency: string;
  source: 'streaming' | 'license' | 'advance' | 'other';
  metadata: Record<string, unknown>;
  created_at: string;
};
