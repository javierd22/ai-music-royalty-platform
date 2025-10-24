export const ATTRIB_API = process.env.NEXT_PUBLIC_ATTRIB_BASE_URL!;
async function j<T>(r: Response) {
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
export async function sdkLog(body: any) {
  return j(
    await fetch(`${ATTRIB_API}/sdk/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}
export async function auditorMatch(body: any) {
  return j(
    await fetch(`${ATTRIB_API}/auditor/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}
export async function fuse(body: any) {
  return j(
    await fetch(`${ATTRIB_API}/fusion/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}
export async function makeClaim(body: any) {
  return j(
    await fetch(`${ATTRIB_API}/claims/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}
export async function makeCertificate(body: any) {
  return j(
    await fetch(`${ATTRIB_API}/proof/certificate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}
