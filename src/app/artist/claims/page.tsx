/**
 * Artist Claims Center Page
 *
 * Per PRD Section 5.1: Artist Platform - Claims Center
 * Allows artists to submit and manage AI use claims
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ClaimForm } from '@/components/ClaimForm';
import { createClaim, getClaims } from '@/lib/api/claims';
import { formatDate } from '@/lib/format';
import { getCurrentArtist } from '@/lib/supabase/auth';
import { createClient } from '@supabase/supabase-js';

interface Artist {
  id: string;
  name: string;
  email: string;
}

interface Track {
  id: string;
  title: string;
}

interface Claim {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  track_id?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  resolved: 'bg-gray-100 text-gray-600',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function ClaimsPage() {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Get current artist
        const currentArtist = await getCurrentArtist();
        if (!currentArtist) {
          setError('Please log in to access claims');
          setIsLoading(false);
          return;
        }

        setArtist(currentArtist);

        // Create Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch artist's tracks
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('id, title')
          .eq('artist_id', currentArtist.id)
          .order('created_at', { ascending: false });

        setTracks(tracksData || []);

        // Fetch artist's claims
        const claimsData = await getClaims();
        setClaims(claimsData);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSubmitClaim = async (formData: any) => {
    if (!artist) {
      throw new Error('Not authenticated');
    }

    try {
      const newClaim = await createClaim({
        artistId: artist.id,
        title: formData.title,
        description: formData.description,
        trackId: formData.trackId || undefined,
        fileUrl: formData.fileUrl || undefined,
        externalLink: formData.externalLink || undefined,
        priority: formData.priority,
      });

      // Add new claim to list
      setClaims([newClaim, ...claims]);
      setShowForm(false);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to submit claim');
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-gray-600'>Loading claims...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='golden-border bg-red-50'>
          <div className='golden-border-content text-center'>
            <p className='text-red-800'>{error}</p>
            <Link href='/artist/login' className='text-red-900 underline mt-2 inline-block'>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className='space-y-8 pb-12'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Claims Center</h1>
          <p className='text-gray-600 mt-1'>Submit and manage potential AI use claims</p>
        </div>
        <div className='flex gap-3'>
          <Link href='/artist/dashboard' className='golden-border inline-block'>
            <div className='golden-border-content'>← Back to Dashboard</div>
          </Link>
          <button onClick={() => setShowForm(!showForm)} className='golden-border inline-block'>
            <div className='golden-border-content'>
              {showForm ? 'Cancel' : '+ Submit New Claim'}
            </div>
          </button>
        </div>
      </div>

      {/* Submit New Claim Form */}
      {showForm && (
        <div className='golden-border'>
          <div className='golden-border-content'>
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>Submit New Claim</h2>
            <ClaimForm
              tracks={tracks}
              onSubmit={handleSubmitClaim}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Claims List */}
      <div>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Your Claims ({claims.length})</h2>

        {claims.length === 0 ? (
          <div className='golden-border'>
            <div className='golden-border-content text-center py-8'>
              <p className='text-gray-600 mb-4'>You haven't submitted any claims yet.</p>
              <p className='text-sm text-gray-500 mb-4'>
                If you discover AI-generated content that may be influenced by your work, submit a
                claim here for investigation.
              </p>
              <button onClick={() => setShowForm(true)} className='golden-border inline-block'>
                <div className='golden-border-content'>Submit Your First Claim</div>
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {claims.map(claim => {
              const track = tracks.find(t => t.id === claim.track_id);
              return (
                <div key={claim.id} className='golden-border'>
                  <div className='golden-border-content'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <h3 className='font-semibold text-gray-900 mb-1'>{claim.title}</h3>
                        {track && (
                          <p className='text-sm text-gray-600'>Related to: {track.title}</p>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-xs px-2 py-1 rounded ${statusColors[claim.status as keyof typeof statusColors] || statusColors.pending}`}
                        >
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${priorityColors[claim.priority as keyof typeof priorityColors] || priorityColors.medium}`}
                        >
                          {claim.priority.charAt(0).toUpperCase() + claim.priority.slice(1)}
                        </span>
                      </div>
                    </div>

                    <p className='text-sm text-gray-700 mb-3 line-clamp-2'>{claim.description}</p>

                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-gray-500'>
                        Submitted: {formatDate(claim.created_at)}
                      </span>
                      <Link
                        href={`/artist/claims/${claim.id}`}
                        className='text-gray-900 hover:text-gray-600 underline'
                      >
                        View Details →
                      </Link>
                    </div>
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
              <h3 className='font-semibold text-gray-900 mb-2'>About Claims</h3>
              <p className='text-sm text-gray-600 mb-2'>
                The Claims Center allows you to report potential AI use of your music that may not
                have been logged through our SDK partners.
              </p>
              <ul className='text-sm text-gray-600 space-y-1 list-disc list-inside'>
                <li>
                  <strong>Pending:</strong> Claim submitted, awaiting initial review
                </li>
                <li>
                  <strong>Investigating:</strong> Our team is analyzing the evidence
                </li>
                <li>
                  <strong>Confirmed:</strong> AI use verified, royalty event may be created
                </li>
                <li>
                  <strong>Rejected:</strong> Insufficient evidence or no match found
                </li>
                <li>
                  <strong>Resolved:</strong> Claim closed with appropriate action taken
                </li>
              </ul>
              <p className='text-sm text-gray-600 mt-2'>
                Per PRD Section 5.4, claims help identify unlogged AI usage and improve detection
                accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Enable dynamic rendering for client-side auth pages
export const dynamic = 'force-dynamic';
