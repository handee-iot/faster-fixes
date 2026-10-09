"use client";

import { signIn, signOut } from "@/lib/auth";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";

export function PortalSignIn() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    const trimmed = email.trim();
    if (trimmed === "" || sending) return;
    setSending(true);
    setFailed(false);
    const { error } = await signIn.magicLink({
      email: trimmed,
      callbackURL: "/portal",
    });
    setSending(false);
    if (error) setFailed(true);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Feedback board
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {sent ? "Check your email" : "Sign in"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {sent
            ? `If ${email.trim()} belongs to a reviewer, a sign-in link is on its way.`
            : "Sign in with the email your reviewer link was created with."}
        </p>
      </div>

      {!sent && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email"
          />
          <Button type="submit" disabled={sending || email.trim() === ""}>
            {sending ? "Sending..." : "Email me a sign-in link"}
          </Button>
          {failed && (
            <p className="text-sm text-destructive">
              Something went wrong. Try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}

type PortalNoAccessProps = {
  email: string;
};

export function PortalNoAccess({ email }: PortalNoAccessProps) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        No board for this account
      </h1>
      <p className="text-sm text-muted-foreground">
        {email} is signed in, but it is not an active reviewer on any project.
        Ask the team for a reviewer link, or sign in with the address they used.
      </p>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          void signOut().then(() => window.location.reload());
        }}
      >
        Sign out
      </Button>
    </main>
  );
}
