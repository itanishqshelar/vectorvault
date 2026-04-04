import { NextResponse } from 'next/server';
import { listTickets, createTicket } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tickets = await listTickets(status || undefined);
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('List tickets error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, customer_email, subject, source_id, metadata } = body;
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const ticket = await createTicket({ source_id, title, description, customer_email, subject, metadata });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
