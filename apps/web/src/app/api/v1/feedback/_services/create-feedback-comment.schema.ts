import { z } from "zod";

export const CreateFeedbackCommentSchema = z
  .object({
    body: z
      .string()
      .trim()
      .max(4000, "Messages are limited to 4000 characters."),
    /** Assets uploaded through the attachments endpoint, in order (ADR-0026). */
    // ADR-0026: three files per comment, the limit the composers show too.
    attachmentIds: z.array(z.string()).max(3).optional(),
  })
  .refine(
    (input) => input.body !== "" || (input.attachmentIds?.length ?? 0) > 0,
    {
      message: "Write a message or attach a file.",
      path: ["body"],
    },
  );

export type CreateFeedbackCommentInput = z.infer<
  typeof CreateFeedbackCommentSchema
>;
