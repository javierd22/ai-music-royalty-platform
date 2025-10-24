/**
 * Server-side Supabase client and queries
 *
 * Per PRD Section 5.4: Royalty Event Engine
 * Uses RSC (React Server Components) for secure server-side data fetching
 */

import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

import { getDualProofStatusForSdkLog } from '@/lib/dualProof';
import type {
  PaginatedRoyaltyEvents,
  PaginationParams,
  ResultWithMatches,
  RoyaltyEventWithTrack,
  RoyaltyFilters,
  RoyaltySummary,
} from '@/types/royalties';
import type { PaginatedSdkLogs, SdkLogFilters, SdkLogWithDualProof } from '@/types/sdk';

/**
 * Create Supabase client for server-side operations
 * Uses service role key or anon key depending on environment
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Missing Supabase environment variables - returning null client');
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Get royalty summary statistics
 * Per PRD Section 5.1: Royalty Ledger shows verified events and payout history
 */
export const getRoyaltySummary = cache(async (): Promise<RoyaltySummary> => {
  const supabase = createServerClient();

  if (!supabase) {
    console.warn('Supabase client not available - returning empty summary');
    return {
      totalEvents: 0,
      totalPayoutCents: 0,
      avgConfidence: 0,
      pendingEvents: 0,
      paidEvents: 0,
    };
  }

  const { data: events, error } = await supabase
    .from('royalty_events')
    .select('amount, match_confidence, status');

  if (error) {
    console.error('Error fetching royalty summary:', error);
    return {
      totalEvents: 0,
      totalPayoutCents: 0,
      avgConfidence: 0,
      pendingEvents: 0,
      paidEvents: 0,
    };
  }

  const summary = events.reduce(
    (acc, event) => {
      acc.totalEvents++;
      acc.totalPayoutCents += Math.round((event.amount || 0) * 100);
      acc.avgConfidence += event.match_confidence || 0;

      if (event.status === 'pending') acc.pendingEvents++;
      if (event.status === 'paid') acc.paidEvents++;

      return acc;
    },
    {
      totalEvents: 0,
      totalPayoutCents: 0,
      avgConfidence: 0,
      pendingEvents: 0,
      paidEvents: 0,
    }
  );

  if (summary.totalEvents > 0) {
    summary.avgConfidence = summary.avgConfidence / summary.totalEvents;
  }

  return summary;
});

const DEFAULT_PAGINATION = { page: 1, pageSize: 10 };

const EMPTY_PAGINATED_RESULT = (pagination: PaginationParams): PaginatedRoyaltyEvents => ({
  events: [],
  total: 0,
  page: pagination.page,
  pageSize: pagination.pageSize,
  totalPages: 0,
});

function applyRoyaltyFilters(query: any, filters: RoyaltyFilters) {
  let filteredQuery = query;
  if (filters.dateFrom) {
    filteredQuery = filteredQuery.gte('verified_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    filteredQuery = filteredQuery.lte('verified_at', filters.dateTo);
  }
  if (filters.minConfidence !== undefined) {
    filteredQuery = filteredQuery.gte('match_confidence', filters.minConfidence);
  }
  if (filters.status) {
    filteredQuery = filteredQuery.eq('status', filters.status);
  }
  return filteredQuery;
}

function enhanceEventWithTrack(event: any): RoyaltyEventWithTrack {
  return {
    ...event,
    track: event.metadata?.track_title
      ? {
          title: event.metadata.track_title,
          artist: event.metadata.artist || 'Unknown Artist',
        }
      : null,
  };
}

/**
 * Get paginated royalty events with optional filters
 * Per PRD Section 5.1: Displays matches with similarity and percentInfluence
 */
export const getRoyaltyEvents = cache(
  async (
    filters: RoyaltyFilters = {},
    pagination: PaginationParams = DEFAULT_PAGINATION
  ): Promise<PaginatedRoyaltyEvents> => {
    const supabase = createServerClient();

    if (!supabase) {
      console.warn('Supabase client not available - returning empty events');
      return EMPTY_PAGINATED_RESULT(pagination);
    }

    let query = supabase.from('royalty_events').select('*', { count: 'exact' });

    query = applyRoyaltyFilters(query, filters);

    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    query = query.order('verified_at', { ascending: false }).range(from, to);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('Error fetching royalty events:', error);
      return EMPTY_PAGINATED_RESULT(pagination);
    }

    const eventsWithTrack = (events || []).map(event => enhanceEventWithTrack(event));

    return {
      events: eventsWithTrack,
      total: count || 0,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil((count || 0) / pagination.pageSize),
    };
  }
);

/**
 * Get a single royalty event by ID with related data
 */
export const getRoyaltyEventById = cache(
  async (id: string): Promise<RoyaltyEventWithTrack | null> => {
    const supabase = createServerClient();

    if (!supabase) {
      console.warn('Supabase client not available - returning null event');
      return null;
    }

    const { data: event, error } = await supabase
      .from('royalty_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !event) {
      console.error('Error fetching royalty event:', error);
      return null;
    }

    return {
      ...event,
      track: event.metadata?.track_title
        ? {
            title: event.metadata.track_title,
            artist: event.metadata.artist || 'Unknown Artist',
          }
        : null,
    };
  }
);

/**
 * Get the result linked to a royalty event
 */
export const getResultByRoyaltyEvent = cache(
  async (resultId: string): Promise<ResultWithMatches | null> => {
    const supabase = createServerClient();

    if (!supabase) {
      console.warn('Supabase client not available - returning null result');
      return null;
    }

    const { data: result, error } = await supabase
      .from('results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error || !result) {
      console.error('Error fetching result:', error);
      return null;
    }

    return result;
  }
);

/**
 * Get recent results for comparison view
 * Per PRD Section 5.1: Results Dashboard displays matches
 */
export const getRecentResults = cache(async (limit: number = 10): Promise<ResultWithMatches[]> => {
  const supabase = createServerClient();

  if (!supabase) {
    console.warn('Supabase client not available - returning empty results');
    return [];
  }

  const { data: results, error } = await supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent results:', error);
    return [];
  }

  return results || [];
});

/**
 * Get paginated SDK logs with optional filters and dual proof status
 * Per PRD Section 5.2: AI Partner SDK
 */
export const getSdkLogs = cache(
  async (
    filters: SdkLogFilters = {},
    pagination: PaginationParams = DEFAULT_PAGINATION
  ): Promise<PaginatedSdkLogs> => {
    const supabase = createServerClient();

    if (!supabase) {
      console.warn('Supabase client not available - returning empty logs');
      return {
        logs: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    let query = supabase.from('ai_use_logs').select('*', { count: 'exact' });

    // Apply filters
    if (filters.trackId) {
      query = query.eq('track_id', filters.trackId);
    }
    if (filters.modelId) {
      query = query.eq('model_id', filters.modelId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching SDK logs:', error);
      return {
        logs: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
      };
    }

    // Enhance logs with dual proof status
    const logsWithDualProof: SdkLogWithDualProof[] = await Promise.all(
      (logs || []).map(async log => {
        const dualProof = await getDualProofStatusForSdkLog(log.id);

        return {
          ...log,
          track: null, // Can be enhanced with track data if needed
          dual_proof_status: dualProof.status,
          result_id: dualProof.resultId,
          royalty_event_id: dualProof.royaltyEventId,
        };
      })
    );

    return {
      logs: logsWithDualProof,
      total: count || 0,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil((count || 0) / pagination.pageSize),
    };
  }
);

/**
 * Get a single SDK log by ID with dual proof status
 */
export const getSdkLogById = cache(async (id: string): Promise<SdkLogWithDualProof | null> => {
  const supabase = createServerClient();

  if (!supabase) {
    console.warn('Supabase client not available - returning null log');
    return null;
  }

  const { data: log, error } = await supabase.from('ai_use_logs').select('*').eq('id', id).single();

  if (error || !log) {
    console.error('Error fetching SDK log:', error);
    return null;
  }

  // Get dual proof status
  const dualProof = await getDualProofStatusForSdkLog(log.id);

  // Get track info if available
  let track = null;
  if (log.track_id) {
    const { data: trackData } = await supabase
      .from('tracks')
      .select('title')
      .eq('id', log.track_id)
      .single();

    if (trackData) {
      track = {
        title: trackData.title,
        artist: undefined,
      };
    }
  }

  return {
    ...log,
    track,
    dual_proof_status: dualProof.status,
    result_id: dualProof.resultId,
    royalty_event_id: dualProof.royaltyEventId,
  };
});
