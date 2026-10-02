import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.JWT_SECRET || 'secret';
const SYNC_SECRET = process.env.JWT_SYNC_SECRET || 'sync_secret';

export interface SessionJwtPayload {
  username: string;
  token_version: number;
  purpose: 'session';
}

export interface SyncJwtPayload {
  username: string;
  purpose: 'sync';
}

export const generateSessionToken = (username: string, token_version: number): string => {
  return jwt.sign({ username, token_version, purpose: 'session' }, SESSION_SECRET, { expiresIn: '30d' });
};

export const verifySessionToken = (token: string): SessionJwtPayload | null => {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as any;
    if (payload.purpose !== 'session') return null;
    return payload as SessionJwtPayload;
  } catch (err) {
    return null;
  }
};

export const generateSyncToken = (username: string): string => {
  return jwt.sign({ username, purpose: 'sync' }, SYNC_SECRET, { expiresIn: '15m' });
};

export const verifySyncToken = (token: string): SyncJwtPayload | null => {
  try {
    const payload = jwt.verify(token, SYNC_SECRET) as any;
    if (payload.purpose !== 'sync') return null;
    return payload as SyncJwtPayload;
  } catch (err) {
    return null;
  }
};
