import { createTokenCipher } from "@/utils/crypto/token-cipher";
import type { TokenCipher } from "@/utils/crypto/token-cipher";

let cipher: TokenCipher | undefined;

function getCipher() {
  // The Reviewer's own key keeps their tokens apart from the Trackers'. See
  // ADR-0003 and ADR-0024.
  cipher ??= createTokenCipher("REVIEWER_TOKEN_ENCRYPTION_KEY");
  return cipher;
}

/**
 * Whether a key is configured. Creation stores the reversible copy only when
 * it is, so a self-hosted instance without the key still creates reviewers;
 * only resending an invite needs it.
 */
export function reviewerTokenEncryptionReady(): boolean {
  return Boolean(process.env.REVIEWER_TOKEN_ENCRYPTION_KEY);
}

export function encryptReviewerToken(plain: string): string {
  return getCipher().encrypt(plain);
}

export function decryptReviewerToken(payload: string): string {
  return getCipher().decrypt(payload);
}
