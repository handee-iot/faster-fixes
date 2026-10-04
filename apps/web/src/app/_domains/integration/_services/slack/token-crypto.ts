import {
  decryptWithKey,
  encryptWithKey,
  loadHexKeyFromEnv,
} from "@/utils/crypto/aes-gcm";

let key: Buffer | undefined;

function getKey() {
  key ??= loadHexKeyFromEnv("SLACK_TOKEN_ENCRYPTION_KEY");
  return key;
}

export function encryptSlackToken(plain: string): string {
  return encryptWithKey(plain, getKey());
}

export function decryptSlackToken(payload: string): string {
  return decryptWithKey(payload, getKey());
}
