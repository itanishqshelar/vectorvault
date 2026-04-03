import { GoogleGenAI } from '@google/genai';

export async function POST() {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime,
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return Response.json({ token: token.name });
  } catch (error) {
    console.error('Ephemeral token error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
