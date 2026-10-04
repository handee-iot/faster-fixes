import { createTokenCipher } from "@/utils/crypto/token-cipher";
import type { TokenCipher } from "@/utils/crypto/token-cipher";

let cipher: TokenCipher | undefined;

function getCipher() {
  // Jira's separate key avoids re-encrypting another Tracker's tokens. See ADR 0003.
  cipher ??= createTokenCipher("JIRA_TOKEN_ENCRYPTION_KEY");
  return cipher;
}

export function encryptToken(plain: string): string {
  return getCipher().encrypt(plain);
}

export function decryptToken(payload: string): string {
  return getCipher().decrypt(payload);
}
