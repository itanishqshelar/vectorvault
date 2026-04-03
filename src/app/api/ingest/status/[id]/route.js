import { NextResponse } from 'next/server';
import { getSourceStatus } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const source = await getSourceStatus(id);
    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
}
