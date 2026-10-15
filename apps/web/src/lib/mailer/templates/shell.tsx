import { BRAND } from "@/lib/mailer/brand";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { emailTailwindConfig } from "./tailwind.config";

type EmailShellProps = {
  children: React.ReactNode;
};

/**
 * The shared frame every email renders in: the brand lockup with its accent
 * rule at the top, the body, and the brand's address at the bottom.
 */
export function EmailShell({ children }: EmailShellProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind config={emailTailwindConfig}>
        <Head />
        <Body className="bg-secondary py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] bg-card px-[40px] py-[40px]">
            <Section>
              <Text className="m-0 text-[20px] font-bold tracking-[-0.02em] text-foreground">
                {BRAND.name}
              </Text>
              <Hr className="mx-0 mt-[10px] mb-[28px] w-[44px] border-t-[3px] border-accent" />
            </Section>

            {children}

            <Hr className="my-[32px] border-border" />

            <Text className="m-0 text-[12px] text-muted-foreground">
              <Link
                href={BRAND.url}
                className="text-muted-foreground underline"
              >
                {BRAND.url.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
