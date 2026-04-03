import { NextResponse } from 'next/server';
import { getSourceFileSignedUrl } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const signedUrl = await getSourceFileSignedUrl(id);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
