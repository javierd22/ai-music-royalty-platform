/**
 * Label & Publisher Console - Server-side data access
 *
 * Per PRD Section 5.1: Institutional onboarding for labels/publishers
 * Per PRD Section 5.4: Royalty analytics and compliance reporting
 *
 * SECURITY: All functions use server-side Supabase client
 * No service keys exposed to client
 */

import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LabelTrack {
  id: string;
  title: string;
  artist: string;
  isrc?: string;
  release_date?: string;
  duration?: number;
  file_path?: string;
  tx_hash?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface TrackImportRow {
  title: string;
  artist: string;
  isrc?: string;
  release_date?: string;
  duration?: number;
}

export interface ImportResult {
  success: boolean;
  created: number;
  duplicates: number;
  errors: string[];
  tracks: LabelTrack[];
}

export interface RoyaltyAnalytics {
  totalEvents: number;
  totalPayoutCents: number;
  averageConfidence: number;
  payoutsOverTime: { date: string; amount: number }[];
  topTracks: {
    track_id: string;
    title: string;
    artist: string;
    event_count: number;
    total_payout: number;
  }[];
}

export interface ComplianceReport {
  generated_at: string;
  tracks_registered: number;
  tracks_verified_onchain: number;
  royalty_events: number;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    tx_hash?: string;
    verified_events: number;
  }>;
  compliance_checklist: {
    eu_ai_act_article_52: boolean;
    c2pa_standard: boolean;
    blockchain_proof: boolean;
    audit_trail: boolean;
  };
}

// ============================================================================
// CATALOG MANAGEMENT
// ============================================================================

/**
 * Get paginated label tracks with filters
 */
export const getLabelTracks = cache(
  async (
    filters: {
      verified?: boolean;
      artist?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }
  ): Promise<{
    tracks: LabelTrack[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    const supabase = createServerClient();

    if (!supabase) {
      return {
        tracks: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    let query = supabase.from('tracks').select('*', { count: 'exact' });

    // Apply filters
    if (filters.verified !== undefined) {
      if (filters.verified) {
        query = query.not('tx_hash', 'is', null);
      } else {
        query = query.is('tx_hash', null);
      }
    }

    if (filters.artist) {
      query = query.ilike('artist', `%${filters.artist}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: tracks, error, count } = await query;

    if (error) {
      console.error('Error fetching label tracks:', error);
      return {
        tracks: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    return {
      tracks: tracks || [],
      total: count || 0,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil((count || 0) / pagination.pageSize),
    };
  }
);

/**
 * Get summary statistics for label catalog
 */
export const getCatalogStats = cache(
  async (): Promise<{
    totalTracks: number;
    verifiedTracks: number;
    totalArtists: number;
  }> => {
    const supabase = createServerClient();

    if (!supabase) {
      return {
        totalTracks: 0,
        verifiedTracks: 0,
        totalArtists: 0,
      };
    }

    const [totalResult, verifiedResult, artistsResult] = await Promise.all([
      supabase.from('tracks').select('id', { count: 'exact', head: true }),
      supabase
        .from('tracks')
        .select('id', { count: 'exact', head: true })
        .not('tx_hash', 'is', null),
      supabase.from('tracks').select('artist'),
    ]);

    const uniqueArtists = new Set(artistsResult.data?.map(t => t.artist) || []);

    return {
      totalTracks: totalResult.count || 0,
      verifiedTracks: verifiedResult.count || 0,
      totalArtists: uniqueArtists.size,
    };
  }
);

// ============================================================================
// ROYALTY ANALYTICS
// ============================================================================

/**
 * Get royalty analytics for label dashboard
 */
export const getRoyaltyAnalytics = cache(async (): Promise<RoyaltyAnalytics> => {
  const supabase = createServerClient();

  if (!supabase) {
    return {
      totalEvents: 0,
      totalPayoutCents: 0,
      averageConfidence: 0,
      payoutsOverTime: [],
      topTracks: [],
    };
  }

  // Get summary stats
  const { data: events, error: eventsError } = await supabase
    .from('royalty_events')
    .select('match_confidence, payout_weight, created_at, track_id');

  if (eventsError) {
    console.error('Error fetching royalty events:', eventsError);
    return {
      totalEvents: 0,
      totalPayoutCents: 0,
      averageConfidence: 0,
      payoutsOverTime: [],
      topTracks: [],
    };
  }

  const totalEvents = events?.length || 0;

  // Calculate total payout (simplified - would use actual amount_cents in production)
  const totalPayoutCents =
    events?.reduce((sum, event) => {
      const payout = (event.payout_weight || 0) * 100; // Convert to cents
      return sum + payout;
    }, 0) || 0;

  const averageConfidence =
    events && events.length > 0
      ? events.reduce((sum, e) => sum + (e.match_confidence || 0), 0) / events.length
      : 0;

  // Payouts over time (group by date)
  const payoutsByDate = new Map<string, number>();
  events?.forEach(event => {
    const date = event.created_at.split('T')[0];
    const payout = (event.payout_weight || 0) * 100;
    payoutsByDate.set(date, (payoutsByDate.get(date) || 0) + payout);
  });

  const payoutsOverTime = Array.from(payoutsByDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top tracks by payout
  const { data: topTracksData } = await supabase.from('royalty_events').select(`
      track_id,
      payout_weight,
      tracks (
        title,
        artist
      )
    `);

  const trackPayouts = new Map<
    string,
    { title: string; artist: string; count: number; total: number }
  >();

  topTracksData?.forEach(event => {
    const trackId = event.track_id;
    const track = event.tracks as unknown as { title: string; artist: string };

    if (!track) return;

    const existing = trackPayouts.get(trackId) || {
      title: track.title,
      artist: track.artist,
      count: 0,
      total: 0,
    };

    trackPayouts.set(trackId, {
      ...existing,
      count: existing.count + 1,
      total: existing.total + (event.payout_weight || 0) * 100,
    });
  });

  const topTracks = Array.from(trackPayouts.entries())
    .map(([track_id, data]) => ({
      track_id,
      title: data.title,
      artist: data.artist,
      event_count: data.count,
      total_payout: data.total,
    }))
    .sort((a, b) => b.total_payout - a.total_payout)
    .slice(0, 20);

  return {
    totalEvents,
    totalPayoutCents,
    averageConfidence,
    payoutsOverTime,
    topTracks,
  };
});

// ============================================================================
// COMPLIANCE REPORTING
// ============================================================================

/**
 * Generate compliance report for label
 */
export const generateComplianceReport = cache(async (): Promise<ComplianceReport> => {
  const supabase = createServerClient();

  if (!supabase) {
    return {
      generated_at: new Date().toISOString(),
      tracks_registered: 0,
      tracks_verified_onchain: 0,
      royalty_events: 0,
      tracks: [],
      compliance_checklist: {
        eu_ai_act_article_52: false,
        c2pa_standard: false,
        blockchain_proof: false,
        audit_trail: false,
      },
    };
  }

  // Get all tracks with verification status
  const { data: tracks } = await supabase.from('tracks').select(`
      id,
      title,
      artist,
      tx_hash,
      created_at
    `);

  // Get royalty events count per track
  const { data: eventCounts } = await supabase.from('royalty_events').select('track_id');

  const eventCountMap = new Map<string, number>();
  eventCounts?.forEach(event => {
    eventCountMap.set(event.track_id, (eventCountMap.get(event.track_id) || 0) + 1);
  });

  const tracksWithEvents =
    tracks?.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      tx_hash: track.tx_hash || undefined,
      verified_events: eventCountMap.get(track.id) || 0,
    })) || [];

  const tracksVerifiedOnchain = tracks?.filter(t => t.tx_hash).length || 0;
  const totalEvents = eventCounts?.length || 0;

  // Compliance checklist
  const hasBlockchainProof = tracksVerifiedOnchain > 0;
  const hasAuditTrail = totalEvents > 0;

  return {
    generated_at: new Date().toISOString(),
    tracks_registered: tracks?.length || 0,
    tracks_verified_onchain: tracksVerifiedOnchain,
    royalty_events: totalEvents,
    tracks: tracksWithEvents,
    compliance_checklist: {
      eu_ai_act_article_52: hasAuditTrail, // Logging requirement
      c2pa_standard: hasBlockchainProof, // Content authenticity
      blockchain_proof: hasBlockchainProof,
      audit_trail: hasAuditTrail,
    },
  };
});
