import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "Api key is needed"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  PORT: z.string(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error("Error while parsing env");
}

const raw = parsed.data;

export const env = Object.freeze({
  OPENAI_API_KEY: raw.OPENAI_API_KEY,
  OPENAI_MODEL: raw.OPENAI_MODEL,
  PORT: raw.PORT,
});
