export function GET() {
  return new Response('0.1.0', { headers: { 'content-type': 'text/plain' } });
}
