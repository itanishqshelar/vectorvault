import { NextResponse } from 'next/server';
import { getSourceFileSignedUrl } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const signedUrl = await getSourceFileSignedUrl(id);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    const { id } = await params;
    if (error.message.includes('No file stored')) {
      return NextResponse.json({ url: `/api/sources/${id}/raw` });
    }
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
