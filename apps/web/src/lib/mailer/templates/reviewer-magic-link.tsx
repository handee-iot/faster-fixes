import { Button, Hr, Section, Text } from "@react-email/components";

import { EmailShell } from "./shell";

export type ReviewerMagicLinkEmailProps = {
  reviewerName?: string;
  projectName: string;
  url: string;
};

export function ReviewerMagicLinkEmail({
  reviewerName,
  projectName,
  url,
}: ReviewerMagicLinkEmailProps) {
  return (
    <EmailShell>
      <Section>
        <Text className="mt-0 mb-[24px] text-[24px] font-bold text-foreground">
          Sign in
        </Text>

        <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] text-foreground">
          {reviewerName ? `Hi ${reviewerName}, ` : "Hi, "}
          use the button below to open the {projectName} feedback board.
        </Text>

        <Section className="mb-[32px] text-center">
          <Button
            href={url}
            className="box-border bg-primary px-[32px] py-[12px] text-[16px] font-medium text-primary-foreground no-underline"
          >
            Open the board
          </Button>
        </Section>

        <Text className="mt-0 mb-[24px] text-[14px] leading-[20px] text-muted-foreground">
          If you can&apos;t click the button, copy and paste this link into your
          browser:
        </Text>

        <Text className="mt-0 mb-[32px] text-[14px] break-all text-muted-foreground">
          {url}
        </Text>

        <Hr className="my-[32px] border-border" />

        <Text className="mt-0 mb-[8px] text-[12px] text-muted-foreground">
          If you did not ask to sign in, you can safely ignore this email.
        </Text>
      </Section>
    </EmailShell>
  );
}
