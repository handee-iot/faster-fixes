import { BRAND } from "@/lib/mailer/brand";
import { Section, Text } from "@react-email/components";

import { EmailShell } from "./shell";

export type WelcomeEmailProps = {
  userName?: string;
};

export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  return (
    <EmailShell>
      <Section>
        <Text className="mt-0 mb-[16px] text-[16px] leading-[24px] text-foreground">
          {userName ? `Hi ${userName},` : "Hi,"}
        </Text>

        <Text className="mt-0 mb-[16px] text-[16px] leading-[24px] text-foreground">
          Welcome to {BRAND.name}. Your account is ready.
        </Text>

        <Text className="mt-0 mb-[16px] text-[16px] leading-[24px] text-foreground">
          If you have any questions, simply reply to this email.
        </Text>

        <Text className="mt-0 mb-0 text-[14px] leading-[20px] text-muted-foreground">
          Thanks for using {BRAND.name}.
        </Text>
      </Section>
    </EmailShell>
  );
}
