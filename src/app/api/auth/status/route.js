import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('google_tokens');
  return NextResponse.json({ connected: !!tokenCookie?.value });
}

export async function DELETE() {
  const response = NextResponse.json({ disconnected: true });
  response.cookies.delete('google_tokens');
  return response;
}
