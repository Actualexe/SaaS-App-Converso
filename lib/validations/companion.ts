import { z } from "zod";
import { subjects } from "@/constants";

export const MAX_SESSION_MINUTES = 60;

// Shared by the builder form and createCompanion: server actions are public
// endpoints, so the server must validate the same shape the form does.
export const companionFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Companion name is required." }).max(100),
  subject: z.enum(subjects, { message: "Subject is required." }),
  topic: z.string().trim().min(1, { message: "Topic is required." }).max(500),
  voice: z.enum(["male", "female"], { message: "Voice is required." }),
  style: z.enum(["formal", "casual"], { message: "Style is required." }),
  duration: z.coerce
    .number()
    .int()
    .min(1, { message: "Duration is required." })
    .max(MAX_SESSION_MINUTES, { message: `Sessions can be at most ${MAX_SESSION_MINUTES} minutes.` }),
});

export type CompanionFormValues = z.infer<typeof companionFormSchema>;
