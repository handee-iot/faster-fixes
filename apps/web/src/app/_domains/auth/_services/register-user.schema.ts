import { z } from "zod";
import { PasswordSchema } from "./password.schema";

export const RegisterUserSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: PasswordSchema,
    confirmPassword: z.string(),
    // Where to land after the verification link is clicked (the invitation
    // page, when the signup started there). A relative path only.
    callbackURL: z.string().startsWith("/").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
