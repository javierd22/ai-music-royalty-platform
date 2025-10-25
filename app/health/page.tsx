import AppShell from '../components/AppShell';

async function check(url: string) {
  const start = Date.now();
  try {
    const ctrl = new globalThis.AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const [healthRes, versionRes] = await Promise.all([
      fetch(new URL('/health', url).toString(), { signal: ctrl.signal, cache: 'no-store' }),
      fetch(new URL('/version', url).toString(), { signal: ctrl.signal, cache: 'no-store' }),
    ]);
    clearTimeout(t);
    return {
      ok: healthRes.ok,
      version: versionRes.ok ? await versionRes.text() : 'unknown',
      ms: Date.now() - start,
    };
  } catch {
    return { ok: false, version: 'unknown', ms: Date.now() - start };
  }
}

function ServiceCard({
  title,
  status,
  url,
}: {
  title: string;
  status: { ok: boolean; version: string; ms: number };
  url: string | undefined;
}) {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>{title}</h2>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {status.ok ? 'UP' : 'DOWN'}
        </div>
      </div>
      <div className='space-y-2 text-sm'>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Version:</span>
          <span className='font-mono text-gray-900'>{status.version}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Latency:</span>
          <span className='font-mono text-gray-900'>{status.ms}ms</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-600'>URL:</span>
          <span className='font-mono text-gray-900 text-xs truncate'>
            {url || 'Not configured'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function HealthPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const attributionBaseUrl = process.env.NEXT_PUBLIC_ATTRIBUTION_BASE_URL;

  const [mainApiStatus, attributionStatus] = await Promise.all([
    apiBaseUrl ? check(apiBaseUrl) : { ok: false, version: 'not configured', ms: 0 },
    attributionBaseUrl
      ? check(attributionBaseUrl)
      : { ok: false, version: 'not configured', ms: 0 },
  ]);

  return (
    <AppShell>
      <div className='space-y-6'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-900'>System Health</h1>
          <p className='text-gray-600 mt-2'>Monitor backend service status and performance</p>
        </div>

        <div className='grid md:grid-cols-2 gap-6'>
          <ServiceCard title='Main API Service' status={mainApiStatus} url={apiBaseUrl} />
          <ServiceCard
            title='Attribution Service'
            status={attributionStatus}
            url={attributionBaseUrl}
          />
        </div>

        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
          <div className='text-center'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Overall System Status</h3>
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                mainApiStatus.ok && attributionStatus.ok
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {mainApiStatus.ok && attributionStatus.ok
                ? 'All Systems Operational'
                : 'Service Issues Detected'}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
