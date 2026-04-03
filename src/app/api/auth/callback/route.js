import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/googleAuth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?auth=error', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const response = NextResponse.redirect(new URL('/?auth=success', request.url));
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  } catch (err) {
    console.error('OAuth callback error:', err?.message, err?.response?.data);
    return NextResponse.redirect(new URL('/?auth=error', request.url));
  }
}
