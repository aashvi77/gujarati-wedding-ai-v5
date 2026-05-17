import OpenAI from "openai";

// Support both Replit AI Integration vars and a standard OPENAI_API_KEY for self-hosting
const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? undefined;

if (!apiKey) {
  throw new Error(
    "No OpenAI API key found. Set OPENAI_API_KEY in your environment variables."
  );
}

export const openai = new OpenAI({ apiKey, baseURL });
