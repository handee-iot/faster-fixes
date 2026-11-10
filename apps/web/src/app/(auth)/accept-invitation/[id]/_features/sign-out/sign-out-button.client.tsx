"use client";

import { signOut } from "@/lib/auth";
import { Button } from "@workspace/ui/components/button";

/** Leaves the current account so the invitation can be accepted as its addressee. */
export function SignOutButton() {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => {
        void signOut().then(() => window.location.reload());
      }}
    >
      Sign out
    </Button>
  );
}
