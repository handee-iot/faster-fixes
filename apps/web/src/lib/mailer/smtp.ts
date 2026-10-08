import "server-only";

import { requireEnv } from "@/utils/environment/require-env";
import nodemailer from "nodemailer";

import type { Contact, EmailResponse, Mailer, MailOptions } from "./types";
import { EmailError } from "./types";

function unsupportedContactsFeature(): never {
  throw new EmailError(
    "Contact management is not supported by the SMTP mailer.",
    "UNSUPPORTED",
  );
}

/**
 * Sends through any SMTP server, so a self-hosted install does not need a
 * Resend or Plunk account (port of ongrowww's self-hosting mailer). Contact
 * management is a provider concept and throws when used.
 */
export class SmtpMailer implements Mailer {
  // Left inferred: `Transporter`'s default generic is `any`, which would make
  // every `sendMail` result unsafe to touch.
  private transport = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST", process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    // Relays that accept unauthenticated mail leave both unset.
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
  });

  public emails = {
    send: async (options: MailOptions): Promise<EmailResponse> => {
      if (!options.body) {
        throw new EmailError("SMTP requires an email body.", "MISSING_BODY");
      }

      const result = await this.transport.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.body,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.name,
          content: Buffer.from(attachment.content, "base64"),
          contentType: attachment.type,
        })),
      });

      return {
        success: true,
        message: "Email sent successfully",
        data: { messageId: result.messageId },
      };
    },
  };

  public contacts = {
    list: async (): Promise<Contact[]> => unsupportedContactsFeature(),
    create: async (): Promise<Contact> => unsupportedContactsFeature(),
    get: async (): Promise<Contact> => unsupportedContactsFeature(),
    update: async (): Promise<Contact> => unsupportedContactsFeature(),
    delete: async (): Promise<Contact> => unsupportedContactsFeature(),
    addToSegment: async (): Promise<void> => unsupportedContactsFeature(),
  };
}
