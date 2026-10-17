import { Section, Text } from "@react-email/components";

import { EmailShell } from "./shell";

export type FeedbackResolvedEmailProps = {
  reviewerName?: string;
  comment: string;
  /** The Feedback's page, already reduced to a short host + path label. */
  pageLabel: string;
};

export function FeedbackResolvedEmail({
  reviewerName,
  comment,
  pageLabel,
}: FeedbackResolvedEmailProps) {
  return (
    <EmailShell>
      <Section>
        <Text className="mt-0 mb-[24px] text-[24px] font-bold text-foreground">
          Feedback resolved
        </Text>

        <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] break-words text-foreground">
          {reviewerName ? `Hi ${reviewerName}, ` : "Hi, "}
          the feedback you left on {pageLabel} has been resolved.
        </Text>

        <Section className="mb-[24px] rounded-[8px] bg-muted px-[24px] py-[16px]">
          <Text className="mt-0 mb-0 text-[16px] leading-[24px] whitespace-pre-line text-foreground">
            {comment}
          </Text>
        </Section>

        <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] text-foreground">
          Thanks for helping us improve.
        </Text>

        <Text className="mt-0 mb-0 text-[12px] text-muted-foreground">
          You received this email because you left feedback on this site.
        </Text>
      </Section>
    </EmailShell>
  );
}
