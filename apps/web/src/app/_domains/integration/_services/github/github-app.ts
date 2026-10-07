import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";

import { requireEnv } from "@/utils/environment/require-env";

// Read on call, not at import: a self-hosted build without the GitHub App
// integration must not need the key to exist.
function getPrivateKey() {
  return requireEnv(
    "GITHUB_PRIVATE_KEY",
    process.env.GITHUB_PRIVATE_KEY,
  ).replace(/\\n/g, "\n");
}

function getAppAuth() {
  return {
    appId: requireEnv("GITHUB_APP_ID", process.env.GITHUB_APP_ID),
    privateKey: getPrivateKey(),
  };
}

export function getAppOctokit() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: getAppAuth(),
  });
}

export function getInstallationOctokit(installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { ...getAppAuth(), installationId },
  });
}
