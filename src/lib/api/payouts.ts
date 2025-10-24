/**
 * Payout API hooks and utilities
 *
 * Per PRD Section 5.4: Royalty Event Engine - DEMO_MODE implementation
 * Provides frontend interface for payout operations with clean abstractions.
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Types
export interface PayoutPreview {
  artist_id: string;
  total_unpaid_events: number;
  total_amount_cents: number;
  total_amount_usd: number;
  events: PayoutEvent[];
}

export interface PayoutEvent {
  event_id: string;
  track_id: string;
  track_title: string;
  artist_name: string;
  amount_cents: number;
  amount_usd: number;
  similarity: number;
  verified_at: string | null;
  metadata: Record<string, any>;
}

export interface CreatePayoutRequest {
  artist_id: string;
  event_ids: string[];
}

export interface PayoutItem {
  event_id: string;
  amount_cents: number;
  amount_usd: number;
}

export interface PayoutReceipt {
  payout_id: string;
  artist_id: string;
  total_amount_cents: number;
  total_amount_usd: number;
  tx_hash: string;
  demo: boolean;
  status: string;
  created_at: string;
  items: PayoutItem[];
}

export interface ArtistPayout {
  payout_id: string;
  amount_cents: number;
  amount_usd: number;
  tx_hash: string;
  demo: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
  item_count: number;
}

export interface ArtistPayoutsResponse {
  artist_id: string;
  payouts: ArtistPayout[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// API Functions
export async function getPayoutPreview(artistId: string): Promise<PayoutPreview> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`/api/payouts/preview?artist_id=${artistId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get payout preview');
  }

  return response.json();
}

export async function createPayout(artistId: string, eventIds: string[]): Promise<PayoutReceipt> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch('/api/payouts/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artist_id: artistId,
      event_ids: eventIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create payout');
  }

  return response.json();
}

export async function getPayoutReceipt(payoutId: string): Promise<PayoutReceipt> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`/api/payouts/receipt/${payoutId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get payout receipt');
  }

  return response.json();
}

export async function getArtistPayouts(
  artistId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ArtistPayoutsResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`/api/artist/payouts?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get artist payouts');
  }

  return response.json();
}

export async function getUnpaidRoyalties(artistId: string): Promise<PayoutPreview> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch('/api/artist/royalties/unpaid', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get unpaid royalties');
  }

  return response.json();
}

// Utility functions
export function formatAmount(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
}

export function formatTxHash(txHash: string, demo: boolean = true): string {
  if (demo) {
    return `Demo: ${txHash.slice(0, 8)}...${txHash.slice(-8)}`;
  }
  return `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'pending':
      return 'text-yellow-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
