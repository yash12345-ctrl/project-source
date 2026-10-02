import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In a real app, ensure this key is exactly 32 bytes (256 bits).
// E.g. crypto.randomBytes(32).toString('hex')
const getEncryptionKey = (): Buffer => {
  const secret = process.env.CRED_ENC_KEY;
  if (!secret) {
    throw new Error('CRED_ENC_KEY is not defined in environment variables');
  }
  // Ensure the key is exactly 32 bytes. If it's a hex string from randomBytes(32), it is 64 chars long.
  // We hash it to safely get exactly 32 bytes regardless of what they provided.
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptPassword = (password: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptPassword = (encryptedPayload: string): string => {
  const key = getEncryptionKey();
  const parts = encryptedPayload.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const ivHex = parts[0] as string;
  const authTagHex = parts[1] as string;
  const encryptedHex = parts[2] as string;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  const decrypted = decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
  
  return decrypted;
};
