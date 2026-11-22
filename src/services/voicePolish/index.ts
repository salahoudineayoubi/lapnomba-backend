/**
 * Reformulation (IA) d'un avis de la communauté : orthographe, grammaire, ponctuation et clarté,
 * sans changer le sens ni la voix de la personne. L'équipe relit et valide dans l'admin :
 * rien n'est publié automatiquement.
 */
import type { ChatClient } from "../campaignTranslation";
import { extractNumbers } from "../campaignTranslation";

const DEFAULT_MODEL = "gpt-4o-mini";
export const MAX_VOICE_CHARS = 3000;

export const buildPolishMessages = (text: string) => [
  {
    role: "system",
    content: [
      "You edit short community reviews written for the Lap Nomba Foundation, a Cameroonian NGO.",
      "Rewrite the review so it reads clean and clear, fixing spelling, grammar, punctuation, capitalisation and SMS-style abbreviations.",
      "Strict rules:",
      "- Keep the SAME language as the review (usually French). If it mixes French with slang or pidgin, write clear standard French.",
      "- Keep the author's meaning, opinions, tone and first-person voice. Do not add praise, facts, names, promises or emojis. Do not remove criticism or suggestions.",
      "- Keep names, places, numbers and the terms 'Lap Nomba' and 'Zaguina' exactly as written.",
      "- Keep roughly the same length; split run-on sentences if needed.",
      "- If the text is already correct, return it unchanged.",
      'Reply with JSON only: {"text": "<the rewritten review>"}',
    ].join("\n"),
  },
  { role: "user", content: text },
];

export const parsePolishResponse = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const text = typeof parsed?.text === "string" ? parsed.text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
};

/** Garde-fous : les nombres sont conservés et la longueur reste proche de l'original. */
export const isAcceptablePolish = (source: string, result: string): boolean => {
  if (!result || result.length > MAX_VOICE_CHARS) return false;
  const ratio = result.length / Math.max(source.length, 1);
  if (source.length > 40 && (ratio < 0.5 || ratio > 1.8)) return false;
  const nums = extractNumbers(source);
  const out = new Set(extractNumbers(result));
  return nums.every((n) => out.has(n));
};

export const polishVoiceText = async (client: ChatClient, text: string): Promise<string> => {
  const source = (text || "").trim().slice(0, MAX_VOICE_CHARS);
  if (!source) throw new Error("Avis vide.");
  const model = (process.env.CAMPAIGN_TRANSLATION_MODEL || "").trim() || DEFAULT_MODEL;
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: "json_object" },
    messages: buildPolishMessages(source),
  });
  const result = parsePolishResponse(completion?.choices?.[0]?.message?.content);
  if (!result || !isAcceptablePolish(source, result)) {
    throw new Error("La reformulation proposée n'est pas fiable. Réessayez ou corrigez à la main.");
  }
  return result;
};
