/**
 * GET /api/compliance/export
 *
 * Generate and download compliance report
 *
 * Per PRD Section 5.4: Compliance reporting
 * SECURITY: Server-side only, authenticated access
 */

import { generateComplianceReport } from '@/lib/supabase/labels';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const report = await generateComplianceReport();

    // Return as JSON for download
    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Compliance export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
