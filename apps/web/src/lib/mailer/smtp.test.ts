import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Mailer } from "./types";

const sendMail =
  vi.fn<(options: Record<string, unknown>) => Promise<{ messageId: string }>>();

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

const { SmtpMailer } = await import("./smtp");

beforeEach(() => {
  sendMail.mockReset();
  sendMail.mockResolvedValue({ messageId: "message_1" });
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SmtpMailer", () => {
  it("sends the rendered body through the transport", async () => {
    const mailer: Mailer = new SmtpMailer();

    await expect(
      mailer.emails.send({
        from: "contact@example.com",
        to: "marie@example.com",
        subject: "Your feedback has been resolved",
        body: "<p>Resolved.</p>",
      }),
    ).resolves.toEqual({
      success: true,
      message: "Email sent successfully",
      data: { messageId: "message_1" },
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: "contact@example.com",
      to: "marie@example.com",
      subject: "Your feedback has been resolved",
      html: "<p>Resolved.</p>",
      attachments: undefined,
    });
  });

  it("decodes base64 attachments into buffers", async () => {
    const mailer: Mailer = new SmtpMailer();

    await mailer.emails.send({
      from: "contact@example.com",
      to: "marie@example.com",
      subject: "With attachment",
      body: "<p>See attached.</p>",
      attachments: [
        {
          name: "report.txt",
          content: Buffer.from("hello").toString("base64"),
          type: "text/plain",
        },
      ],
    });

    const options = sendMail.mock.calls[0]![0];
    const attachments = options.attachments as {
      filename: string;
      content: Buffer;
      contentType: string;
    }[];
    expect(attachments[0]!.filename).toBe("report.txt");
    expect(attachments[0]!.content.toString()).toBe("hello");
    expect(attachments[0]!.contentType).toBe("text/plain");
  });

  it("refuses a send without a body", async () => {
    const mailer: Mailer = new SmtpMailer();

    await expect(
      mailer.emails.send({
        from: "contact@example.com",
        to: "marie@example.com",
        subject: "No body",
      }),
    ).rejects.toMatchObject({ code: "MISSING_BODY" });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("requires SMTP_HOST at construction", () => {
    vi.stubEnv("SMTP_HOST", "");

    expect(() => new SmtpMailer()).toThrow(
      "Missing environment variable: SMTP_HOST",
    );
  });

  it("throws for contact management, which SMTP has no concept of", async () => {
    const mailer: Mailer = new SmtpMailer();

    await expect(mailer.contacts.list()).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
    await expect(
      mailer.contacts.addToSegment({ email: "a@b.com", segmentId: "s" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });
});
