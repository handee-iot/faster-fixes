import { Button, Hr, Link, Section, Text } from "@react-email/components";

import { EmailShell } from "./shell";

export type ReviewerInviteEmailProps = {
  reviewerName?: string;
  projectName: string;
  /** The one-click board link (the hand-off URL). */
  boardUrl: string;
  /** The client's own site with the widget armed for this reviewer. */
  feedbackUrl: string;
};

export function ReviewerInviteEmail({
  reviewerName,
  projectName,
  boardUrl,
  feedbackUrl,
}: ReviewerInviteEmailProps) {
  return (
    <EmailShell>
      <Section>
        <Text className="mt-0 mb-[24px] text-[24px] font-bold text-foreground">
          You&apos;re on the {projectName} feedback board
        </Text>

        <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] break-words text-foreground">
          {reviewerName ? `Hi ${reviewerName}, ` : "Hi, "}
          the team has set you up on their feedback board. Open it below to
          follow what you have reported and see what the team is doing about it.
        </Text>

        <Section className="mb-[32px] text-center">
          <Button
            href={boardUrl}
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
          {boardUrl}
        </Text>

        <Hr className="my-[32px] border-border" />

        <Text className="mt-0 mb-[8px] text-[14px] leading-[20px] text-foreground">
          To report something new, open the widget on your site:
        </Text>

        <Text className="mt-0 mb-0 text-[14px] break-all">
          <Link href={feedbackUrl} className="text-muted-foreground underline">
            {feedbackUrl}
          </Link>
        </Text>
      </Section>
    </EmailShell>
  );
}
