'use client';

/**
 * Generate Report Button Component
 *
 * Triggers compliance report generation and download
 */

import { useState } from 'react';

export default function GenerateReportButton() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/compliance/export');
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message
      alert('Compliance report generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>Generate Compliance Report</h2>
      <p className='text-sm text-gray-600 mb-6'>
        Download a comprehensive JSON report containing all registered tracks, blockchain
        verification status, royalty events, and compliance checklist. This report can be submitted
        to regulatory authorities or used for internal audits.
      </p>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className='inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        <svg className='h-5 w-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
        {generating ? 'Generating Report...' : 'Generate Report (JSON)'}
      </button>
    </div>
  );
}
