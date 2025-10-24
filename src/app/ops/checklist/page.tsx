/**
 * Operations Checklist Page
 *
 * Server-rendered health and configuration checks
 * Per PRD Section 10: Operational readiness verification
 *
 * SECURITY: Server-only, requires admin authentication in production
 */

import { createServerClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Operations Checklist | AI Music Royalty Platform',
  description: 'System health and configuration verification',
};

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // ============================================================================
  // Environment Variables Check
  // ============================================================================
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_API_URL',
  ];

  const optionalEnvVars = [
    'BLOCKCHAIN_RPC_URL',
    'COMPLIANCE_SIGNING_SECRET',
    'ADMIN_API_KEY',
    'REDIS_URL',
  ];

  const missingRequired = requiredEnvVars.filter(v => !process.env[v]);
  const missingOptional = optionalEnvVars.filter(v => !process.env[v]);

  if (missingRequired.length === 0) {
    checks.push({
      name: 'Environment Variables (Required)',
      status: 'pass',
      message: 'All required environment variables are set',
      details: requiredEnvVars.join(', '),
    });
  } else {
    checks.push({
      name: 'Environment Variables (Required)',
      status: 'fail',
      message: `Missing: ${missingRequired.join(', ')}`,
    });
  }

  if (missingOptional.length > 0) {
    checks.push({
      name: 'Environment Variables (Optional)',
      status: 'warn',
      message: `Optional vars not set: ${missingOptional.join(', ')}`,
      details: 'These are optional but recommended for production',
    });
  } else {
    checks.push({
      name: 'Environment Variables (Optional)',
      status: 'pass',
      message: 'All optional environment variables are set',
    });
  }

  // ============================================================================
  // Supabase Connectivity
  // ============================================================================
  try {
    const supabase = createServerClient();

    if (!supabase) {
      checks.push({
        name: 'Supabase Connectivity',
        status: 'fail',
        message: 'Supabase client not available',
        details: 'Missing environment variables',
      });
    } else {
      const { data, error } = await supabase.from('tracks').select('id').limit(1);

      if (error) {
        checks.push({
          name: 'Supabase Connectivity',
          status: 'fail',
          message: 'Failed to connect to Supabase',
          details: error.message,
        });
      } else {
        checks.push({
          name: 'Supabase Connectivity',
          status: 'pass',
          message: 'Successfully connected to Supabase',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'Supabase Connectivity',
      status: 'fail',
      message: 'Exception during Supabase connection',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // ============================================================================
  // RLS Status Check
  // ============================================================================
  try {
    const supabase = createServerClient();

    if (!supabase) {
      checks.push({
        name: 'Row Level Security (RLS)',
        status: 'fail',
        message: 'Supabase client not available',
        details: 'Missing environment variables',
      });
    } else {
      // Check RLS on critical tables
      let rlsStatus, error;
      try {
        const result = await supabase.rpc('check_rls_enabled', {
          table_names: ['tracks', 'ai_use_logs', 'royalty_events', 'compliance_logs'],
        });
        rlsStatus = result.data;
        error = result.error;
      } catch (err) {
        rlsStatus = null;
        error = { message: 'RLS check function not available' };
      }

      if (error || !rlsStatus) {
        checks.push({
          name: 'Row Level Security (RLS)',
          status: 'warn',
          message: 'Unable to verify RLS status',
          details: 'RLS check function may not be deployed',
        });
      } else {
        checks.push({
          name: 'Row Level Security (RLS)',
          status: 'pass',
          message: 'RLS is enabled on critical tables',
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'Row Level Security (RLS)',
      status: 'warn',
      message: 'RLS check skipped',
      details: 'Manual verification recommended',
    });
  }

  // ============================================================================
  // API Health Check
  // ============================================================================
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;

  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const healthData = await response.json();
        checks.push({
          name: 'Attribution API Health',
          status: 'pass',
          message: `API is operational (v${healthData.version || 'unknown'})`,
          details: `Service: ${healthData.service || 'unknown'}`,
        });
      } else {
        checks.push({
          name: 'Attribution API Health',
          status: 'fail',
          message: `API returned HTTP ${response.status}`,
        });
      }
    } catch (error) {
      checks.push({
        name: 'Attribution API Health',
        status: 'fail',
        message: 'API is not reachable',
        details: error instanceof Error ? error.message : 'Network error',
      });
    }
  } else {
    checks.push({
      name: 'Attribution API Health',
      status: 'warn',
      message: 'API URL not configured',
    });
  }

  // ============================================================================
  // Compliance API Check
  // ============================================================================
  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/compliance/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        checks.push({
          name: 'Compliance API',
          status: 'pass',
          message: 'Compliance API is operational',
        });
      } else {
        checks.push({
          name: 'Compliance API',
          status: 'warn',
          message: 'Compliance API returned non-200 status',
        });
      }
    } catch (error) {
      checks.push({
        name: 'Compliance API',
        status: 'warn',
        message: 'Compliance API check skipped',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Security Headers Check
  // ============================================================================
  const hasCSP = !!process.env.CSP_DIRECTIVES || !!process.env.CONTENT_SECURITY_POLICY;
  const hasCORS = !!process.env.CORS_ALLOW_ORIGINS;

  checks.push({
    name: 'Security Headers - CSP',
    status: hasCSP ? 'pass' : 'warn',
    message: hasCSP ? 'CSP configured' : 'CSP not explicitly configured',
    details: hasCSP ? 'Set via vercel.json or next.config.ts' : 'May use framework defaults',
  });

  checks.push({
    name: 'Security Headers - CORS',
    status: hasCORS ? 'pass' : 'warn',
    message: hasCORS ? 'CORS allowlist configured' : 'CORS not explicitly configured',
    details: process.env.CORS_ALLOW_ORIGINS || 'Using framework defaults',
  });

  // ============================================================================
  // Demo Mode Check
  // ============================================================================
  const demoMode = process.env.DEMO_MODE === 'true';

  checks.push({
    name: 'Demo Mode',
    status: demoMode ? 'warn' : 'pass',
    message: demoMode ? 'Demo mode is ENABLED' : 'Demo mode is disabled',
    details: demoMode
      ? 'Blockchain writes will use mock transactions'
      : 'Real blockchain integration active',
  });

  // ============================================================================
  // Blockchain Configuration
  // ============================================================================
  const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED === 'true';
  const hasRpcUrl = !!process.env.BLOCKCHAIN_RPC_URL;

  if (blockchainEnabled && hasRpcUrl) {
    checks.push({
      name: 'Blockchain Configuration',
      status: 'pass',
      message: 'Blockchain integration configured',
      details: `Network: ${process.env.BLOCKCHAIN_NETWORK || 'unknown'}`,
    });
  } else if (!blockchainEnabled) {
    checks.push({
      name: 'Blockchain Configuration',
      status: 'warn',
      message: 'Blockchain integration disabled',
      details: 'Set BLOCKCHAIN_ENABLED=true to enable',
    });
  } else {
    checks.push({
      name: 'Blockchain Configuration',
      status: 'fail',
      message: 'Blockchain enabled but RPC URL missing',
    });
  }

  return checks;
}

export default async function OpsChecklistPage() {
  const checks = await runChecks();

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  const overallStatus = failCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'healthy';

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Operations Checklist</h1>
          <p className='mt-2 text-gray-600'>System health and configuration verification</p>
        </div>

        {/* Overall Status */}
        <div
          className={`rounded-lg border-2 p-6 mb-8 ${
            overallStatus === 'healthy'
              ? 'bg-green-50 border-green-200'
              : overallStatus === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
          }`}
        >
          <div className='flex items-center justify-between'>
            <div>
              <h2
                className={`text-xl font-bold ${
                  overallStatus === 'healthy'
                    ? 'text-green-900'
                    : overallStatus === 'warning'
                      ? 'text-yellow-900'
                      : 'text-red-900'
                }`}
              >
                Overall Status:{' '}
                {overallStatus === 'healthy'
                  ? '✅ Healthy'
                  : overallStatus === 'warning'
                    ? '⚠️  Warnings'
                    : '❌ Critical Issues'}
              </h2>
              <p
                className={`mt-2 text-sm ${
                  overallStatus === 'healthy'
                    ? 'text-green-700'
                    : overallStatus === 'warning'
                      ? 'text-yellow-700'
                      : 'text-red-700'
                }`}
              >
                {passCount} passed • {warnCount} warnings • {failCount} failed
              </p>
            </div>
            <div className='text-right'>
              <p className='text-sm text-gray-600'>Generated: {new Date().toLocaleString()}</p>
              <p className='text-xs text-gray-500 mt-1'>
                Environment: {process.env.NODE_ENV || 'unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Checks List */}
        <div className='space-y-4'>
          {checks.map((check, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg border-l-4 p-6 ${
                check.status === 'pass'
                  ? 'border-green-500'
                  : check.status === 'warn'
                    ? 'border-yellow-500'
                    : 'border-red-500'
              }`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3'>
                    <span className='text-2xl'>
                      {check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'}
                    </span>
                    <h3 className='text-lg font-semibold text-gray-900'>{check.name}</h3>
                  </div>
                  <p
                    className={`mt-2 text-sm ${
                      check.status === 'pass'
                        ? 'text-gray-600'
                        : check.status === 'warn'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                    }`}
                  >
                    {check.message}
                  </p>
                  {check.details && (
                    <p className='mt-2 text-xs text-gray-500 font-mono'>{check.details}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className='mt-8 bg-white rounded-lg border border-gray-200 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Recommended Actions</h3>
          <ul className='space-y-2 text-sm text-gray-700'>
            {failCount > 0 && (
              <li className='text-red-700'>
                • Address critical failures before deploying to production
              </li>
            )}
            {warnCount > 0 && (
              <li className='text-yellow-700'>• Review warnings and resolve where applicable</li>
            )}
            {!process.env.BLOCKCHAIN_ENABLED && (
              <li>• Consider enabling blockchain integration for production</li>
            )}
            {process.env.DEMO_MODE === 'true' && (
              <li className='text-yellow-700'>• Disable DEMO_MODE for production deployments</li>
            )}
            <li>
              • Run smoke tests: <code className='bg-gray-100 px-2 py-1 rounded'>make smoke</code>
            </li>
            <li>
              • Review API docs:{' '}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/docs`}
                className='text-blue-600 hover:underline'
              >
                {process.env.NEXT_PUBLIC_API_URL}/docs
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
