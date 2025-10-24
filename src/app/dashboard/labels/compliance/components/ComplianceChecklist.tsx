'use client';

/**
 * Compliance Checklist Component
 *
 * Shows compliance status for regulatory requirements
 * Per PRD Section 12: Ethical principles alignment
 */

interface ComplianceChecklistProps {
  checklist: {
    eu_ai_act_article_52: boolean;
    c2pa_standard: boolean;
    blockchain_proof: boolean;
    audit_trail: boolean;
  };
}

export default function ComplianceChecklist({ checklist }: ComplianceChecklistProps) {
  const items = [
    {
      key: 'eu_ai_act_article_52',
      label: 'EU AI Act Article 52',
      description: 'Transparency requirements for AI systems - logging and disclosure',
      status: checklist.eu_ai_act_article_52,
    },
    {
      key: 'c2pa_standard',
      label: 'C2PA Standard',
      description: 'Content authenticity and provenance verification',
      status: checklist.c2pa_standard,
    },
    {
      key: 'blockchain_proof',
      label: 'Blockchain Proof',
      description: 'Immutable on-chain verification of track registration',
      status: checklist.blockchain_proof,
    },
    {
      key: 'audit_trail',
      label: 'Audit Trail',
      description: 'Complete attribution and royalty event history',
      status: checklist.audit_trail,
    },
  ];

  const compliantCount = items.filter(item => item.status).length;
  const totalCount = items.length;

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-lg font-semibold text-gray-900'>Compliance Checklist</h2>
        <span className='text-sm font-medium text-gray-600'>
          {compliantCount} of {totalCount} requirements met
        </span>
      </div>

      <div className='space-y-4'>
        {items.map(item => (
          <div
            key={item.key}
            className={`p-4 rounded-lg border ${
              item.status ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className='flex items-start'>
              <div className='flex-shrink-0 mt-0.5'>
                {item.status ? (
                  <svg
                    className='h-5 w-5 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                ) : (
                  <svg
                    className='h-5 w-5 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                )}
              </div>
              <div className='ml-3 flex-1'>
                <div
                  className={`text-sm font-medium ${
                    item.status ? 'text-green-900' : 'text-gray-900'
                  }`}
                >
                  {item.label}
                </div>
                <div className={`mt-1 text-sm ${item.status ? 'text-green-700' : 'text-gray-600'}`}>
                  {item.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
