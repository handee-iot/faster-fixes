import { createTokenCipher } from "@/utils/crypto/token-cipher";
import type { TokenCipher } from "@/utils/crypto/token-cipher";

let cipher: TokenCipher | undefined;

function getCipher() {
  cipher ??= createTokenCipher("LINEAR_TOKEN_ENCRYPTION_KEY");
  return cipher;
}

export function encryptToken(plain: string): string {
  return getCipher().encrypt(plain);
}

export function decryptToken(payload: string): string {
  return getCipher().decrypt(payload);
}
