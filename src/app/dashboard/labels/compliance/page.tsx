/**
 * Compliance Reporting Page
 *
 * Per PRD Section 5.4: Compliance and audit reporting
 * Per PRD Section 12: Ethical principles and EU AI Act alignment
 *
 * Generate compliance reports for regulatory requirements
 */

import { generateComplianceReport } from '@/lib/supabase/labels';
import { Suspense } from 'react';
import ComplianceChecklist from './components/ComplianceChecklist';
import ComplianceOverview from './components/ComplianceOverview';
import GenerateReportButton from './components/GenerateReportButton';

export const metadata = {
  title: 'Compliance Reports | Label Console',
  description: 'Generate regulatory compliance reports',
};

export default async function CompliancePage() {
  const report = await generateComplianceReport();

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Compliance Reports</h1>
          <p className='mt-2 text-gray-600'>
            Generate compliance reports for regulatory requirements and audits
          </p>
        </div>

        {/* Compliance Overview */}
        <Suspense fallback={<OverviewLoading />}>
          <ComplianceOverview report={report} />
        </Suspense>

        {/* Compliance Checklist */}
        <div className='mt-8'>
          <Suspense fallback={<ChecklistLoading />}>
            <ComplianceChecklist checklist={report.compliance_checklist} />
          </Suspense>
        </div>

        {/* Generate Report */}
        <div className='mt-8'>
          <GenerateReportButton />
        </div>

        {/* Documentation */}
        <div className='mt-8 bg-white rounded-lg border border-gray-200 p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>About Compliance</h2>
          <div className='prose prose-sm text-gray-700 space-y-3'>
            <p>
              <strong>EU AI Act Article 52:</strong> Transparency obligations for AI systems. All
              AI-generated content must be logged and disclosed to users.
            </p>
            <p>
              <strong>C2PA Standard:</strong> Content authenticity and provenance verification
              through cryptographic signatures and blockchain anchoring.
            </p>
            <p>
              <strong>Blockchain Proof:</strong> Immutable on-chain verification of track
              registration and royalty events provides tamper-proof audit trail.
            </p>
            <p className='text-sm text-gray-600 mt-4'>
              Generated reports include all registered tracks, verification status, blockchain proof
              hashes, and compliance checklist for regulatory audits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewLoading() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
      <div className='space-y-4'>
        <div className='h-6 bg-gray-200 rounded w-40'></div>
        <div className='grid grid-cols-3 gap-4'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='h-20 bg-gray-100 rounded'></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChecklistLoading() {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6 animate-pulse'>
      <div className='space-y-3'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className='h-12 bg-gray-100 rounded'></div>
        ))}
      </div>
    </div>
  );
}
