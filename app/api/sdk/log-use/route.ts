import { getServerSupabase } from '@/supabaseServer';
import { SdkUseSlip } from '@/types';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('sdk_logs')
    .insert({
      partner_id: body.partner_id ?? null,
      track_id: body.track_id ?? null,
      model: body.model ?? null,
      event: body.event ?? 'reference',
      payload: body.payload ?? {},
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as SdkUseSlip, { status: 201 });
}
