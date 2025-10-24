/**
 * React Hooks for Artist Data
 *
 * Per PRD Section 5.1: Artist Platform
 * Provides hooks for fetching tracks, royalties, claims, and reports.
 *
 * USAGE:
 * ```tsx
 * const { tracks, loading, error } = useArtistTracks();
 * const { royalties } = useArtistRoyalties({ status: 'confirmed' });
 * const { claims } = useArtistClaims();
 * const { report, generateReport } = useArtistReport();
 * ```
 */

'use client';

import { useEffect, useState } from 'react';

// API Base URL (from env or default to localhost)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// ============================================================================
// Types
// ============================================================================

export interface ArtistTrack {
  id: string;
  title: string;
  storage_url: string;
  artist_id: string;
  created_at: string;
  updated_at: string;
  fingerprinted: boolean;
  onchain_tx?: string;
  onchain_verified: boolean;
}

export interface ArtistRoyalty {
  id: string;
  track_id: string;
  track_title?: string;
  amount: number;
  match_confidence: number;
  status: string;
  verified_at?: string;
  onchain_tx?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ArtistClaim {
  id: string;
  artist_id: string;
  track_id?: string;
  track_title?: string;
  title: string;
  description: string;
  file_url?: string;
  external_link?: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface ArtistReport {
  artist_id: string;
  artist_name: string;
  generated_at: string;
  total_tracks: number;
  total_royalties: number;
  total_earnings: number;
  confirmed_events: number;
  pending_events: number;
  total_claims: number;
  verified_tracks: Array<{
    track_id: string;
    title: string;
    onchain_tx?: string;
    created_at: string;
  }>;
  recent_royalties: Array<{
    royalty_id: string;
    track_id: string;
    track_title?: string;
    amount: number;
    confidence: number;
    status: string;
    verified_at?: string;
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make authenticated API request
 */
async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch artist tracks with pagination
 */
export function useArtistTracks(options?: { page?: number; pageSize?: number }) {
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchWithAuth<{
          tracks: ArtistTrack[];
          total: number;
          page: number;
          page_size: number;
        }>(`${API_BASE_URL}/artist/tracks?page=${page}&page_size=${pageSize}`);

        if (!cancelled) {
          setTracks(data.tracks);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tracks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return { tracks, total, loading, error, refetch: () => {} };
}

/**
 * Fetch artist royalties with pagination and filtering
 */
export function useArtistRoyalties(options?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const [royalties, setRoyalties] = useState<ArtistRoyalty[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const status = options?.status;

  useEffect(() => {
    let cancelled = false;

    async function loadRoyalties() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });

        if (status) {
          params.append('status', status);
        }

        const data = await fetchWithAuth<{
          royalties: ArtistRoyalty[];
          total: number;
          page: number;
          page_size: number;
        }>(`${API_BASE_URL}/artist/royalties?${params}`);

        if (!cancelled) {
          setRoyalties(data.royalties);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load royalties');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRoyalties();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, status]);

  return { royalties, total, loading, error, refetch: () => {} };
}

/**
 * Fetch artist claims with pagination and filtering
 */
export function useArtistClaims(options?: { page?: number; pageSize?: number; status?: string }) {
  const [claims, setClaims] = useState<ArtistClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const status = options?.status;

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });

        if (status) {
          params.append('status', status);
        }

        const data = await fetchWithAuth<{
          claims: ArtistClaim[];
          total: number;
          page: number;
          page_size: number;
        }>(`${API_BASE_URL}/artist/claims?${params}`);

        if (!cancelled) {
          setClaims(data.claims);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load claims');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClaims();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, status]);

  return { claims, total, loading, error, refetch: () => {} };
}

/**
 * Generate artist compliance report
 */
export function useArtistReport() {
  const [report, setReport] = useState<ArtistReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth<{ report: ArtistReport }>(`${API_BASE_URL}/artist/reports`);

      setReport(data.report);
      return data.report;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { report, loading, error, generateReport };
}
