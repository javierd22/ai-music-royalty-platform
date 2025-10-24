/**
 * Artist Dashboard Page (React Server Component)
 *
 * Per PRD Section 5.1: Artist Platform - Results Dashboard & Royalty Ledger
 * Shows registered tracks, royalty events with on-chain verification badges
 */

import Link from 'next/link';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { ProofBadge } from '@/components/ProofBadge';
import { TrackCard } from '@/components/TrackCard';
import VerificationBadge from '@/components/VerificationBadge';
import { formatCurrency, formatDate } from '@/lib/format';

// Create server-side Supabase client
async function createServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

async function getArtistData(artistId: string) {
  const supabase = await createServerClient();

  // Get artist tracks
  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });

  if (tracksError) {
    console.error('Error fetching tracks:', tracksError);
  }

  // Get royalty events for this artist's tracks
  const trackIds = tracks?.map(t => t.id) || [];
  const { data: royaltyEvents, error: royaltyError } = await supabase
    .from('royalty_events')
    .select('*')
    .in('track_id', trackIds)
    .order('verified_at', { ascending: false })
    .limit(10);

  if (royaltyError) {
    console.error('Error fetching royalty events:', royaltyError);
  }

  // Calculate summary stats
  const totalEarnings = royaltyEvents?.reduce((sum, event) => sum + (event.amount || 0), 0) || 0;
  const totalEvents = royaltyEvents?.length || 0;
  const confirmedEvents = royaltyEvents?.filter(e => e.status === 'confirmed').length || 0;

  return {
    tracks: tracks || [],
    royaltyEvents: royaltyEvents || [],
    stats: {
      totalTracks: tracks?.length || 0,
      totalEvents,
      confirmedEvents,
      totalEarnings,
    },
  };
}

async function getCurrentArtist() {
  const supabase = await createServerClient();

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  // Get artist profile
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (artistError || !artist) {
    return null;
  }

  return artist;
}

export default async function ArtistDashboardPage() {
  const artist = await getCurrentArtist();

  if (!artist) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='golden-border bg-red-50'>
          <div className='golden-border-content text-center'>
            <p className='text-red-800'>Unable to load artist profile. Please log in again.</p>
            <Link href='/artist/login' className='text-red-900 underline mt-2 inline-block'>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { tracks, royaltyEvents, stats } = await getArtistData(artist.id);

  return (
    <section className='space-y-8 pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Artist Dashboard</h1>
          <p className='text-gray-600 mt-1'>Welcome back, {artist.name}</p>
        </div>
        <div className='flex gap-3'>
          <Link href='/upload' className='golden-border inline-block'>
            <div className='golden-border-content'>Upload Track</div>
          </Link>
          <Link href='/artist/claims' className='golden-border inline-block'>
            <div className='golden-border-content'>Submit Claim</div>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <div className='text-sm text-gray-600 mb-1'>Registered Tracks</div>
            <div className='text-3xl font-bold text-gray-900'>{stats.totalTracks}</div>
          </div>
        </div>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <div className='text-sm text-gray-600 mb-1'>Royalty Events</div>
            <div className='text-3xl font-bold text-gray-900'>{stats.totalEvents}</div>
          </div>
        </div>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <div className='text-sm text-gray-600 mb-1'>Confirmed</div>
            <div className='text-3xl font-bold text-green-600'>{stats.confirmedEvents}</div>
          </div>
        </div>
        <div className='golden-border'>
          <div className='golden-border-content'>
            <div className='text-sm text-gray-600 mb-1'>Total Earnings</div>
            <div className='text-3xl font-bold text-gray-900'>
              {formatCurrency(stats.totalEarnings)}
            </div>
          </div>
        </div>
      </div>

      {/* Artist Profile Card */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='flex justify-between items-start'>
            <div>
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>Artist Profile</h2>
              <div className='space-y-2 text-sm'>
                <div>
                  <span className='text-gray-600'>Email:</span>{' '}
                  <span className='font-medium text-gray-900'>{artist.email}</span>
                  {artist.email_verified && (
                    <span className='ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded'>
                      ✓ Verified
                    </span>
                  )}
                </div>
                {artist.wallet && (
                  <div>
                    <span className='text-gray-600'>Wallet:</span>{' '}
                    <span className='font-mono text-sm text-gray-900'>
                      {artist.wallet.slice(0, 6)}...{artist.wallet.slice(-4)}
                    </span>
                  </div>
                )}
                <div>
                  <span className='text-gray-600'>Member Since:</span>{' '}
                  <span className='font-medium text-gray-900'>{formatDate(artist.created_at)}</span>
                </div>
              </div>
            </div>
            <Link
              href='/artist/profile'
              className='text-sm text-gray-900 hover:text-gray-600 underline'
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Registered Tracks */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold text-gray-900'>Your Tracks</h2>
          <Link href='/upload' className='text-sm text-gray-900 hover:text-gray-600 underline'>
            Upload New Track →
          </Link>
        </div>

        {tracks.length === 0 ? (
          <div className='golden-border'>
            <div className='golden-border-content text-center py-8'>
              <p className='text-gray-600 mb-4'>You haven't uploaded any tracks yet.</p>
              <Link href='/upload' className='golden-border inline-block'>
                <div className='golden-border-content'>Upload Your First Track</div>
              </Link>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {tracks.map(track => (
              <TrackCard key={track.id} track={track} artistName={artist.name} showActions />
            ))}
          </div>
        )}
      </div>

      {/* Recent Royalty Events */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold text-gray-900'>Recent Royalty Events</h2>
          <Link href='/dashboard' className='text-sm text-gray-900 hover:text-gray-600 underline'>
            View All Events →
          </Link>
        </div>

        {royaltyEvents.length === 0 ? (
          <div className='golden-border'>
            <div className='golden-border-content text-center py-8'>
              <p className='text-gray-600'>No royalty events yet.</p>
              <p className='text-sm text-gray-500 mt-2'>
                Events will appear here when AI companies log usage and the auditor confirms
                matches.
              </p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {royaltyEvents.map(event => {
              const track = tracks.find(t => t.id === event.track_id);
              return (
                <div key={event.id} className='golden-border'>
                  <div className='golden-border-content'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <h3 className='font-semibold text-gray-900 mb-1'>
                          {track?.title || 'Unknown Track'}
                        </h3>
                        <p className='text-sm text-gray-600'>{formatDate(event.verified_at)}</p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <ProofBadge
                          proofType='dual'
                          status={event.status === 'confirmed' ? 'verified' : 'pending'}
                        />
                        {event.onchain_tx && (
                          <VerificationBadge
                            entityType='event'
                            entityId={event.id}
                            txHash={event.onchain_tx}
                            verified={!!event.onchain_tx}
                            compact
                          />
                        )}
                      </div>
                    </div>

                    <div className='grid grid-cols-3 gap-4 text-sm'>
                      <div>
                        <div className='text-gray-600 mb-1'>Amount</div>
                        <div className='font-medium text-gray-900'>
                          {formatCurrency(event.amount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className='text-gray-600 mb-1'>Confidence</div>
                        <div className='font-medium text-gray-900'>
                          {((event.match_confidence || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className='text-gray-600 mb-1'>Status</div>
                        <div className='font-medium text-gray-900 capitalize'>{event.status}</div>
                      </div>
                    </div>

                    {event.metadata?.model_id && (
                      <div className='mt-3 text-xs text-gray-500'>
                        Model: {event.metadata.model_id}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className='golden-border'>
        <div className='golden-border-content'>
          <div className='flex gap-3'>
            <div className='text-2xl'>ℹ️</div>
            <div className='flex-1'>
              <h3 className='font-semibold text-gray-900 mb-2'>About Your Dashboard</h3>
              <p className='text-sm text-gray-600 mb-2'>
                Per PRD Section 5.1, your artist dashboard provides:
              </p>
              <ul className='text-sm text-gray-600 space-y-1 list-disc list-inside'>
                <li>View all registered tracks with fingerprinting status</li>
                <li>Monitor royalty events with dual proof verification (SDK + Auditor)</li>
                <li>Check on-chain verification badges for transparent provenance</li>
                <li>Submit claims for potential unauthorized AI use</li>
                <li>Link to compliance reports via the Compliance API</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
