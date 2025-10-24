/**
 * Label & Publisher Console - Landing Page
 *
 * Per PRD Section 5.1: Institutional onboarding
 * Per PRD Phase 3: Labels and publishers
 *
 * Entry point for label/publisher features
 */

import { getCatalogStats, getRoyaltyAnalytics } from '@/lib/supabase/labels';
import Link from 'next/link';

export const metadata = {
  title: 'Label Console | AI Music Royalty Platform',
  description: 'Manage your catalog and track royalty performance',
};

export default async function LabelsLandingPage() {
  const [catalogStats, analytics] = await Promise.all([getCatalogStats(), getRoyaltyAnalytics()]);

  const features = [
    {
      title: 'Catalog Upload',
      description: 'Import track metadata via CSV to register your catalog quickly',
      href: '/dashboard/labels/upload',
      icon: (
        <svg className='h-8 w-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
          />
        </svg>
      ),
      stat: `${catalogStats.totalTracks} tracks registered`,
    },
    {
      title: 'Catalog Management',
      description: 'View and manage your registered tracks with verification status',
      href: '/dashboard/labels/catalog',
      icon: (
        <svg className='h-8 w-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
          />
        </svg>
      ),
      stat: `${catalogStats.verifiedTracks} verified on-chain`,
    },
    {
      title: 'Royalty Analytics',
      description: 'Track performance with charts, top tracks, and CSV export',
      href: '/dashboard/labels/royalties',
      icon: (
        <svg className='h-8 w-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      ),
      stat: `${analytics.totalEvents} verified events`,
    },
    {
      title: 'Compliance Reports',
      description: 'Generate regulatory reports for EU AI Act and blockchain verification',
      href: '/dashboard/labels/compliance',
      icon: (
        <svg className='h-8 w-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
          />
        </svg>
      ),
      stat: 'Full audit trail available',
    },
  ];

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Hero Section */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold text-gray-900 sm:text-5xl'>
              Label & Publisher Console
            </h1>
            <p className='mt-4 text-xl text-gray-600 max-w-3xl mx-auto'>
              Professional tools for catalog management, royalty tracking, and compliance reporting.
              Built for transparency and regulatory compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {features.map(feature => (
            <Link
              key={feature.href}
              href={feature.href}
              className='block bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-900 hover:shadow-lg transition-all'
            >
              <div className='flex items-start'>
                <div className='flex-shrink-0 text-gray-900'>{feature.icon}</div>
                <div className='ml-6 flex-1'>
                  <h3 className='text-xl font-semibold text-gray-900 mb-2'>{feature.title}</h3>
                  <p className='text-gray-600 mb-4'>{feature.description}</p>
                  <div className='text-sm font-medium text-gray-900'>{feature.stat}</div>
                </div>
              </div>
              <div className='mt-6 flex items-center text-gray-900 font-medium'>
                <span>Get started</span>
                <svg className='ml-2 h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Documentation */}
        <div className='mt-12 bg-white rounded-lg border border-gray-200 p-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>About This Console</h2>
          <div className='prose prose-sm text-gray-700 space-y-4'>
            <p>
              The Label & Publisher Console provides institutional-grade tools for catalog
              onboarding, royalty analytics, and regulatory compliance. Built on transparent
              blockchain verification and dual-proof attribution, this platform ensures fair
              compensation for your catalog.
            </p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Key Features</h3>
                <ul className='space-y-2 text-sm'>
                  <li>• Bulk catalog upload via CSV</li>
                  <li>• On-chain verification tracking</li>
                  <li>• Real-time royalty analytics</li>
                  <li>• Export reports for accounting</li>
                  <li>• EU AI Act compliance</li>
                </ul>
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Compliance</h3>
                <ul className='space-y-2 text-sm'>
                  <li>• EU AI Act Article 52 aligned</li>
                  <li>• C2PA content authenticity</li>
                  <li>• Blockchain-verified proof</li>
                  <li>• Complete audit trail</li>
                  <li>• Regulatory reporting ready</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
