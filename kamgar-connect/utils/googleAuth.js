// Verifies a "Sign in with Google" ID token (the `credential` the Google
// button gives the website) using Google's tokeninfo endpoint.
// Returns { googleId, email, name } or null if the token is not valid for us.
const TOKENINFO_URL = process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';

async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !credential) return null;
  try {
    const res = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) return null;
    const info = await res.json();
    const issuerOk = ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss);
    const notExpired = Number(info.exp) * 1000 > Date.now();
    const emailVerified = info.email_verified === true || info.email_verified === 'true';
    if (info.aud !== clientId || !issuerOk || !notExpired || !emailVerified || !info.sub) return null;
    return { googleId: info.sub, email: info.email, name: info.name || '' };
  } catch (err) {
    console.error('Google token check failed:', err.message);
    return null;
  }
}

module.exports = { verifyGoogleCredential };
