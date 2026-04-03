import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/googleAuth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Google returned an error (e.g. user denied access)
  if (error) {
    const reason = encodeURIComponent(error);
    return NextResponse.redirect(new URL(`/?auth=error&reason=${reason}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?auth=error&reason=no_code', request.url)
    );
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
    console.error('OAuth callback error:', err);
    const detail = err?.response?.data?.error || err?.message || 'token_exchange_failed';
    const reason = encodeURIComponent(detail);
    return NextResponse.redirect(
      new URL(`/?auth=error&reason=${reason}`, request.url)
    );
  }
}
