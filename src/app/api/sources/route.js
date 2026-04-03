import { NextResponse } from 'next/server';
import { getSources, deleteSource } from '@/lib/supabase';

export async function GET() {
  try {
    const sources = await getSources();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Sources error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'No source ID provided' }, { status: 400 });
    }

    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
