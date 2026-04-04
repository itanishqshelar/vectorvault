import { NextResponse } from 'next/server';
import { updateTicketStatus } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!['OPEN', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'status must be OPEN or RESOLVED' }, { status: 400 });
    }

    const ticket = await updateTicketStatus(id, status);
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
