import { verifyToken } from '@clerk/clerk-sdk-node';

const dev = process.env.NODE_ENV !== 'production';
const secretPresent = !!process.env.CLERK_SECRET_KEY;
// Dev fallback: only active outside prod AND DEV_AUTH=true.
const devAuthEnabled = dev && process.env.DEV_AUTH === 'true';

async function tryVerify(token) {
  if (!token) throw new Error('No token');
  if (!secretPresent) throw new Error('Missing CLERK_SECRET_KEY');
  return verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
}

function buildDevUser(req) {
  if (!devAuthEnabled) return false;
  if (!req.auth) req.auth = { userId: process.env.DEV_USER_ID || 'dev_user_123' };
  return true;
}

// Optional auth: attach req.auth when token valid; never rejects request.
export const authOptional = async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    buildDevUser(req); // allow dev fallback even when header missing
    return next();
  }
  const token = auth.split(' ')[1];
  try {
    const payload = await tryVerify(token);
    req.auth = { userId: payload.sub };
  } catch (e) {
    if (dev) console.warn('[authOptional] token ignored:', e.message);
    buildDevUser(req);
  }
  next();
};

// Required auth: reject 401 unless valid token (or dev fallback active).
export const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    if (buildDevUser(req)) return next();
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = await tryVerify(token);
    req.auth = { userId: payload.sub };
    return next();
  } catch (e) {
    if (buildDevUser(req)) return next();
    if (dev) console.error('[requireAuth] token verification failed:', e.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
