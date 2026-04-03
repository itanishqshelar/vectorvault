import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Creates an OAuth client with tokens and tracks any token refreshes.
 * Returns { auth, getUpdatedTokens } where getUpdatedTokens() returns
 * the latest tokens if they were refreshed, or null if unchanged.
 */
export function getOAuthClientWithTokens(tokens) {
  const client = createOAuthClient();
  client.setCredentials(tokens);

  let updatedTokens = null;

  client.on('tokens', (newTokens) => {
    updatedTokens = {
      ...tokens,
      ...newTokens,
    };
    // Preserve the original refresh_token if the new one is missing
    if (!updatedTokens.refresh_token && tokens.refresh_token) {
      updatedTokens.refresh_token = tokens.refresh_token;
    }
    client.setCredentials(updatedTokens);
  });

  return {
    auth: client,
    getUpdatedTokens: () => updatedTokens,
  };
}
