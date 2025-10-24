'use client';
import { auditorMatch, fuse, makeCertificate, makeClaim, sdkLog } from '@/lib/attrib-api';
import { useState } from 'react';

export default function SimulatorPage() {
  const [trackId, setTrackId] = useState('');
  const [modelId, setModelId] = useState('suno-x');
  const [partnerLogId, setPartnerLogId] = useState('');
  const [auditorMatchId, setAuditorMatchId] = useState('');
  const [royaltyEventId, setRoyaltyEventId] = useState('');
  const [claimId, setClaimId] = useState('');
  const [amountCents, setAmountCents] = useState(125);
  const [out, setOut] = useState<any>(null);

  async function runSdkLog() {
    const started_at = new Date().toISOString();
    const r = (await sdkLog({
      model_id: modelId,
      track_id: trackId,
      session_type: 'generate',
      started_at,
      ended_at: started_at,
      raw: { note: 'sim' },
    })) as any;
    setPartnerLogId(r.partner_log_id);
    setOut(r);
  }
  async function runAuditor() {
    const r = (await auditorMatch({
      track_id: trackId,
      output_id: 'out-001',
      model_id: modelId,
      match_score: 0.92,
      phrase_seconds: [12, 18, 45, 53],
    })) as any;
    setAuditorMatchId(r.auditor_match_id);
    setOut(r);
  }
  async function runFuse() {
    const r = (await fuse({
      partner_log_id: partnerLogId,
      auditor_match_id: auditorMatchId,
    })) as any;
    setRoyaltyEventId(r.royalty_event_id);
    setOut(r);
  }
  async function runClaim() {
    const r = (await makeClaim({
      royalty_event_id: royaltyEventId,
      amount_cents: amountCents,
    })) as any;
    setClaimId(r.claim_id);
    setOut(r);
  }
  async function runCert() {
    const r = (await makeCertificate({
      royalty_event_id: royaltyEventId,
      make_public: true,
    })) as any;
    setOut(r);
  }

  return (
    <div className='p-6 space-y-6'>
      <h1 className='text-2xl font-semibold'>Artist Simulator</h1>

      <div className='space-y-3 p-4 rounded-xl border'>
        <h2 className='text-xl font-medium'>Simulator</h2>
        <div className='grid gap-3 md:grid-cols-3'>
          <input
            className='border rounded p-2'
            placeholder='track_id (uuid)'
            value={trackId}
            onChange={e => setTrackId(e.target.value)}
          />
          <input
            className='border rounded p-2'
            placeholder='model_id'
            value={modelId}
            onChange={e => setModelId(e.target.value)}
          />
          <input
            className='border rounded p-2'
            placeholder='amount_cents'
            type='number'
            value={amountCents}
            onChange={e => setAmountCents(parseInt(e.target.value || '0'))}
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          <button onClick={runSdkLog} className='px-3 py-2 rounded bg-black text-white'>
            1. Log partner use
          </button>
          <button onClick={runAuditor} className='px-3 py-2 rounded bg-black text-white'>
            2. Add auditor match
          </button>
          <button onClick={runFuse} className='px-3 py-2 rounded bg-black text-white'>
            3. Fuse to royalty_event
          </button>
          <button onClick={runClaim} className='px-3 py-2 rounded bg-black text-white'>
            4. Create claim
          </button>
          <button onClick={runCert} className='px-3 py-2 rounded bg-black text-white'>
            5. Create proof certificate
          </button>
        </div>
        <div className='grid gap-2 md:grid-cols-2'>
          <div className='text-sm'>
            partner_log_id: <b>{partnerLogId}</b>
          </div>
          <div className='text-sm'>
            auditor_match_id: <b>{auditorMatchId}</b>
          </div>
          <div className='text-sm'>
            royalty_event_id: <b>{royaltyEventId}</b>
          </div>
          <div className='text-sm'>
            claim_id: <b>{claimId}</b>
          </div>
        </div>
        <pre className='text-xs bg-gray-50 p-3 rounded overflow-auto'>
          {out ? JSON.stringify(out, null, 2) : 'Run a step to see output'}
        </pre>
      </div>

      <div className='p-4 rounded-xl border'>
        <h2 className='text-xl font-medium'>Detected Influences</h2>
        <p className='text-sm opacity-70'>
          In alpha, populate via SQL or build a server action to read auditor_matches for this
          artist's tracks.
        </p>
      </div>

      <div className='p-4 rounded-xl border'>
        <h2 className='text-xl font-medium'>Verified Uses</h2>
        <p className='text-sm opacity-70'>
          In alpha, show royalty_events where payable is true and link to proof pages.
        </p>
      </div>
    </div>
  );
}
