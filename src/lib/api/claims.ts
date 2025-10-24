/**
 * Claims API Client
 *
 * Per PRD Section 5.1: Artist Platform - Claims Center
 * Client-side API for submitting and managing claims
 */

interface CreateClaimParams {
  artistId: string;
  title: string;
  description: string;
  trackId?: string;
  fileUrl?: string;
  externalLink?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface Claim {
  id: string;
  artist_id: string;
  track_id?: string;
  title: string;
  description: string;
  file_url?: string;
  external_link?: string;
  status: 'pending' | 'investigating' | 'confirmed' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  investigation_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

interface ClaimEvidence {
  id: string;
  claim_id: string;
  evidence_type: 'audio_file' | 'video_file' | 'screenshot' | 'link' | 'document' | 'other';
  file_url?: string;
  external_url?: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

interface ClaimComment {
  id: string;
  claim_id: string;
  author_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new claim
 */
export async function createClaim(params: CreateClaimParams): Promise<Claim> {
  const response = await fetch('/api/claims/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create claim');
  }

  const data = await response.json();
  return data.claim;
}

/**
 * Get all claims for the current artist
 */
export async function getClaims(): Promise<Claim[]> {
  const response = await fetch('/api/claims');

  if (!response.ok) {
    throw new Error('Failed to fetch claims');
  }

  const data = await response.json();
  return data.claims;
}

/**
 * Get a single claim by ID
 */
export async function getClaimById(claimId: string): Promise<Claim> {
  const response = await fetch(`/api/claims/${claimId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch claim');
  }

  const data = await response.json();
  return data.claim;
}

/**
 * Update a claim
 */
export async function updateClaim(
  claimId: string,
  updates: Partial<CreateClaimParams>
): Promise<Claim> {
  const response = await fetch(`/api/claims/${claimId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update claim');
  }

  const data = await response.json();
  return data.claim;
}

/**
 * Delete a claim
 */
export async function deleteClaim(claimId: string): Promise<void> {
  const response = await fetch(`/api/claims/${claimId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete claim');
  }
}

/**
 * Add evidence to a claim
 */
export async function addClaimEvidence(
  claimId: string,
  evidence: {
    evidenceType: ClaimEvidence['evidence_type'];
    fileUrl?: string;
    externalUrl?: string;
    description?: string;
  }
): Promise<ClaimEvidence> {
  const response = await fetch(`/api/claims/${claimId}/evidence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(evidence),
  });

  if (!response.ok) {
    throw new Error('Failed to add evidence');
  }

  const data = await response.json();
  return data.evidence;
}

/**
 * Add comment to a claim
 */
export async function addClaimComment(claimId: string, comment: string): Promise<ClaimComment> {
  const response = await fetch(`/api/claims/${claimId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment }),
  });

  if (!response.ok) {
    throw new Error('Failed to add comment');
  }

  const data = await response.json();
  return data.comment;
}

/**
 * Get comments for a claim
 */
export async function getClaimComments(claimId: string): Promise<ClaimComment[]> {
  const response = await fetch(`/api/claims/${claimId}/comments`);

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }

  const data = await response.json();
  return data.comments;
}
