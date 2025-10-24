import { getServerSupabase } from '@/supabaseServer';
import { Track } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Track[]);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      title: body?.title,
      storage_url: body?.storage_url,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Track, { status: 201 });
}
