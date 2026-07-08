import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Chiffrement symétrique des secrets (clés API BYOK) au repos.
// AES-256-GCM : confidentialité + intégrité (l'authTag détecte toute altération).
// Format de sortie (base64) : iv(12) || authTag(16) || ciphertext.

function getKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BYOK_ENCRYPTION_KEY manquante.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "BYOK_ENCRYPTION_KEY invalide : 32 octets attendus (base64). Générer avec `openssl rand -base64 32`.",
    );
  }
  return key;
}

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
