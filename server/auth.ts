import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb, saveDb, hashPassword, UserRecord } from './db.js';

// In-memory token store: token -> { userId, expiresAt }
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export function generateToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7-day expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, { userId, expiresAt });
  return token;
}

export function revokeToken(token: string) {
  sessions.delete(token);
}

export function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export interface AuthenticatedRequest extends Request {
  user?: ReturnType<typeof sanitizeUser>;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.substring(7).trim();

  // Support Firebase ID tokens or JWTs
  if (token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadStr);
        const uid = payload.user_id || payload.sub;
        if (uid) {
          if (payload.exp && Date.now() / 1000 > payload.exp) {
            return res.status(401).json({ error: 'Session has expired. Please sign in again.' });
          }
          const db = getDb();
          let user = db.users.find(u => u.id === uid || (payload.email && u.email.toLowerCase() === payload.email.toLowerCase()));
          if (!user) {
            user = {
              id: uid,
              email: payload.email || `${uid}@firebase.user`,
              name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
              role: 'freelancer',
              passwordHash: '',
              salt: '',
              createdAt: new Date().toISOString(),
            };
            db.users.push(user);
            saveDb(db);
          }
          req.user = sanitizeUser(user);
          return next();
        }
      }
    } catch {
      // ignore and fall through
    }
  }

  const session = sessions.get(token);

  if (!session) {
    // For demo tokens or fallback, check if it's a demo token
    if (token === 'demo-token-freelancer') {
      const db = getDb();
      const user = db.users.find(u => u.id === 'user-freelancer-1');
      if (user) {
        req.user = sanitizeUser(user);
        return next();
      }
    }
    if (token === 'demo-token-client') {
      const db = getDb();
      const user = db.users.find(u => u.id === 'user-client-1');
      if (user) {
        req.user = sanitizeUser(user);
        return next();
      }
    }
    if (token === 'demo-token-admin') {
      const db = getDb();
      let user = db.users.find(u => u.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1');
      if (!user) {
        user = {
          id: 'OP8cEaPrWJcWPuT5PSxGD3Efacn1',
          email: 'admin@clientvault.app',
          name: 'System Administrator',
          role: 'admin',
          passwordHash: '',
          salt: '',
          createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        };
      }
      req.user = sanitizeUser(user);
      return next();
    }
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session has expired. Please sign in again.' });
  }

  const db = getDb();
  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = sanitizeUser(user);
  next();
}
