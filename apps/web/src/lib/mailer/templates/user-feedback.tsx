import { Hr, Section, Text } from "@react-email/components";

import { EmailShell } from "./shell";

type UserFeedbackProps = {
  senderName?: string;
  senderEmail?: string;
  message?: string;
};

export function UserFeedback({
  senderName = "A user",
  senderEmail = "user@example.com",
  message = "This is a sample feedback message.",
}: UserFeedbackProps) {
  return (
    <EmailShell>
      <Section>
        <Text className="mt-0 mb-[24px] text-[24px] font-bold text-foreground">
          New feedback
        </Text>

        <Text className="mt-0 mb-[24px] text-[16px] leading-[24px] text-foreground">
          <strong>{senderName}</strong> ({senderEmail}) sent feedback:
        </Text>

        <Section className="mb-[32px] rounded-[8px] bg-muted px-[24px] py-[16px]">
          <Text className="mt-0 mb-0 text-[16px] leading-[24px] whitespace-pre-line text-foreground">
            {message}
          </Text>
        </Section>

        <Hr className="my-[32px] border-border" />

        <Text className="mt-0 mb-[8px] text-[12px] text-muted-foreground">
          This message was sent via the application feedback form.
        </Text>
      </Section>
    </EmailShell>
  );
}
