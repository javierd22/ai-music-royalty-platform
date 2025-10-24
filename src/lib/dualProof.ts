/**
 * Dual Proof Logic (TypeScript)
 * Per PRD Section 5.4: Royalty Event Engine
 *
 * Dual Proof verification requires:
 * 1. SDK log from AI partner (ai_use_logs)
 * 2. Attribution auditor detection (results)
 *
 * Status values:
 * - confirmed: Royalty event exists linking both proofs
 * - pending: SDK log and result align but no royalty event yet
 * - none: No dual proof alignment found
 */

import { createClient } from '@supabase/supabase-js';

export type DualProofStatus = 'confirmed' | 'pending' | 'none';

export interface DualProofResult {
  status: DualProofStatus;
  sdkLogId: string | null;
  resultId: string | null;
  royaltyEventId: string | null;
  similarity: number | null;
  sdkConfidence: number | null;
}

// Configuration from environment
const DUAL_PROOF_WINDOW_MINUTES = Number.parseInt(
  process.env.DUAL_PROOF_WINDOW_MINUTES || '10',
  10
);
const DUAL_PROOF_THRESHOLD = Number.parseFloat(process.env.DUAL_PROOF_THRESHOLD || '0.85');

/**
 * Get server-side Supabase client for dual proof queries
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function checkRoyaltyEventStatus(
  supabase: any,
  resultId: string,
  trackId: string,
  similarity: number
): Promise<DualProofResult | null> {
  const { data: royaltyEvents } = await supabase
    .from('royalty_events')
    .select('id, ai_use_log_id')
    .eq('result_id', resultId)
    .eq('track_id', trackId);

  if (!royaltyEvents || royaltyEvents.length === 0) {
    return null;
  }

  const event = royaltyEvents[0];
  const sdkLogId = event.ai_use_log_id;
  let sdkConfidence = null;

  if (sdkLogId) {
    const { data: sdkLog } = await supabase
      .from('ai_use_logs')
      .select('confidence')
      .eq('id', sdkLogId)
      .single();

    if (sdkLog) {
      sdkConfidence = sdkLog.confidence;
    }
  }

  return {
    status: 'confirmed',
    sdkLogId,
    resultId,
    royaltyEventId: event.id,
    similarity,
    sdkConfidence,
  };
}

async function checkPendingStatus(
  supabase: any,
  trackId: string,
  createdAt: Date,
  resultId: string,
  similarity: number
): Promise<DualProofResult> {
  const windowStart = new Date(createdAt.getTime() - DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(createdAt.getTime() + DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);

  const { data: sdkLogs } = await supabase
    .from('ai_use_logs')
    .select('*')
    .eq('track_id', trackId)
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (sdkLogs && sdkLogs.length > 0) {
    const log = sdkLogs[0];
    return {
      status: 'pending',
      sdkLogId: log.id,
      resultId,
      royaltyEventId: null,
      similarity,
      sdkConfidence: log.confidence,
    };
  }

  return {
    status: 'none',
    sdkLogId: null,
    resultId,
    royaltyEventId: null,
    similarity,
    sdkConfidence: null,
  };
}

/**
 * Determine dual proof status for a specific attribution result
 */
export async function getDualProofStatusForResult(resultId: string): Promise<DualProofResult> {
  const supabase = getSupabaseClient();

  const { data: result, error: resultError } = await supabase
    .from('results')
    .select('*')
    .eq('id', resultId)
    .single();

  if (resultError || !result) {
    return {
      status: 'none',
      sdkLogId: null,
      resultId,
      royaltyEventId: null,
      similarity: null,
      sdkConfidence: null,
    };
  }

  const similarity = result.similarity || 0;

  if (similarity < DUAL_PROOF_THRESHOLD) {
    return {
      status: 'none',
      sdkLogId: null,
      resultId,
      royaltyEventId: null,
      similarity,
      sdkConfidence: null,
    };
  }

  // Check for confirmed status (royalty event exists)
  const confirmed = await checkRoyaltyEventStatus(supabase, resultId, result.track_id, similarity);
  if (confirmed) {
    return confirmed;
  }

  // Check for pending status (SDK log within window)
  return checkPendingStatus(
    supabase,
    result.track_id,
    new Date(result.created_at),
    resultId,
    similarity
  );
}

/**
 * Determine dual proof status for a track at a given timestamp
 */
export async function getDualProofStatusForTrack(
  trackId: string,
  timestamp: Date = new Date()
): Promise<DualProofResult> {
  const supabase = getSupabaseClient();

  const windowStart = new Date(timestamp.getTime() - DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(timestamp.getTime() + DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);

  // Find results for this track near the timestamp
  const { data: results } = await supabase
    .from('results')
    .select('*')
    .eq('track_id', trackId)
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())
    .gte('similarity', DUAL_PROOF_THRESHOLD)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!results || results.length === 0) {
    return {
      status: 'none',
      sdkLogId: null,
      resultId: null,
      royaltyEventId: null,
      similarity: null,
      sdkConfidence: null,
    };
  }

  // Check most recent result for dual proof
  return getDualProofStatusForResult(results[0].id);
}

/**
 * Determine dual proof status for a specific SDK log
 */
export async function getDualProofStatusForSdkLog(logId: string): Promise<DualProofResult> {
  const supabase = getSupabaseClient();

  // Get the SDK log
  const { data: log, error: logError } = await supabase
    .from('ai_use_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (logError || !log) {
    return {
      status: 'none',
      sdkLogId: logId,
      resultId: null,
      royaltyEventId: null,
      similarity: null,
      sdkConfidence: null,
    };
  }

  const trackId = log.track_id;
  const createdAt = new Date(log.created_at);
  const sdkConfidence = log.confidence;

  // Check for royalty event first
  const { data: royaltyEvents } = await supabase
    .from('royalty_events')
    .select('id, result_id, similarity')
    .eq('ai_use_log_id', logId)
    .eq('track_id', trackId);

  if (royaltyEvents && royaltyEvents.length > 0) {
    const event = royaltyEvents[0];
    return {
      status: 'confirmed',
      sdkLogId: logId,
      resultId: event.result_id,
      royaltyEventId: event.id,
      similarity: event.similarity,
      sdkConfidence,
    };
  }

  // Check for matching result within time window
  const windowStart = new Date(createdAt.getTime() - DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(createdAt.getTime() + DUAL_PROOF_WINDOW_MINUTES * 60 * 1000);

  const { data: results } = await supabase
    .from('results')
    .select('*')
    .eq('track_id', trackId)
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())
    .gte('similarity', DUAL_PROOF_THRESHOLD)
    .order('created_at', { ascending: false })
    .limit(1);

  if (results && results.length > 0) {
    const result = results[0];
    return {
      status: 'pending',
      sdkLogId: logId,
      resultId: result.id,
      royaltyEventId: null,
      similarity: result.similarity,
      sdkConfidence,
    };
  }

  return {
    status: 'none',
    sdkLogId: logId,
    resultId: null,
    royaltyEventId: null,
    similarity: null,
    sdkConfidence,
  };
}

/**
 * Get dual proof configuration
 */
export function getDualProofConfig() {
  return {
    windowMinutes: DUAL_PROOF_WINDOW_MINUTES,
    threshold: DUAL_PROOF_THRESHOLD,
  };
}
