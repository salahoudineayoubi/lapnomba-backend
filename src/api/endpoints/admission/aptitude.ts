/**
 * Admissions v2 — test d'aptitude en ligne.
 *
 * - 15 questions tirées au hasard dans la banque (répartition fixe par catégorie),
 *   avec l'ordre des réponses mélangé pour chaque candidat (le partage de « corrigés » ne sert à rien).
 * - Les bonnes réponses ne quittent jamais le serveur ; le score n'est pas communiqué au candidat.
 * - Une seule tentative, chronométrée côté serveur ; les réponses sont enregistrées au fil de l'eau
 *   (une coupure réseau ne fait rien perdre), le test est clos à l'échéance.
 */
import crypto from "crypto";
import { ApolloError, UserInputError } from "apollo-server-express";

import { APTITUDE_QUESTION_BANK, AptitudeQuestionSeed } from "../../../scripts/aptitudeQuestionBank";
import { IApplicationSession } from "../../../models/applicationSession";
import { getSessionByToken } from "./session";

export const APTITUDE_DURATION_SECONDS = 20 * 60;
const GRACE_SECONDS = 60;
const PLAN: Record<AptitudeQuestionSeed["category"], number> = { logique: 5, calcul: 4, comprehension: 3, numerique: 3 };

const byCode = new Map(APTITUDE_QUESTION_BANK.map((q) => [q.code, q]));

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** « LOG-01|2031 » : code de la question + permutation des 4 réponses affichées. */
const encode = (code: string, perm: number[]) => `${code}|${perm.join("")}`;
const decode = (entry: string) => {
  const [code, perm] = entry.split("|");
  return { code, perm: (perm || "0123").split("").map(Number) };
};

const publicQuestions = (entries: string[]) =>
  entries.map((entry, i) => {
    const { code, perm } = decode(entry);
    const q = byCode.get(code)!;
    return { id: String(i), category: q.category, prompt: q.prompt, choices: perm.map((k) => q.choices[k]) };
  });

const finalize = (s: IApplicationSession, now = new Date()) => {
  const a = s.aptitude!;
  let score = 0;
  for (const ans of a.answers || []) {
    const idx = Number(ans.questionCode);
    const entry = a.questionCodes[idx];
    if (entry === undefined) continue;
    const { code, perm } = decode(entry);
    const q = byCode.get(code);
    if (q && perm[ans.choice] === q.answerIndex) score += 1;
  }
  const end = Math.min(now.getTime(), new Date(a.endsAt).getTime());
  a.submittedAt = now;
  a.score = score;
  a.total = a.questionCodes.length;
  a.durationSeconds = Math.max(0, Math.round((end - new Date(a.startedAt).getTime()) / 1000));
  s.markModified("aptitude");
};

const isExpired = (s: IApplicationSession, now = Date.now()) =>
  now > new Date(s.aptitude!.endsAt).getTime() + GRACE_SECONDS * 1000;

export const startAptitudeTest = async (_: any, { token }: { token: string }) => {
  const s = await getSessionByToken(token);
  if (s.submittedCandidatureId) throw new ApolloError("Votre candidature a déjà été envoyée.", "ALREADY_SUBMITTED");

  if (s.aptitude?.submittedAt) {
    throw new ApolloError("Vous avez déjà passé le test. Une seule tentative est autorisée.", "APTITUDE_DONE");
  }
  if (s.aptitude?.startedAt) {
    if (isExpired(s)) {
      finalize(s);
      await s.save();
      throw new ApolloError("Le temps du test est écoulé. Vos réponses ont été enregistrées.", "APTITUDE_DONE");
    }
  } else {
    const picked: string[] = [];
    (Object.keys(PLAN) as AptitudeQuestionSeed["category"][]).forEach((cat) => {
      const pool = shuffle(APTITUDE_QUESTION_BANK.filter((q) => q.category === cat));
      pool.slice(0, PLAN[cat]).forEach((q) => picked.push(encode(q.code, shuffle([0, 1, 2, 3]))));
    });
    const startedAt = new Date();
    s.aptitude = {
      questionCodes: shuffle(picked),
      startedAt,
      endsAt: new Date(startedAt.getTime() + APTITUDE_DURATION_SECONDS * 1000),
      answers: [],
    };
    s.markModified("aptitude");
    await s.save();
  }
  const a = s.aptitude!;
  const answered = Object.fromEntries((a.answers || []).map((x) => [x.questionCode, x.choice]));
  return {
    questions: publicQuestions(a.questionCodes).map((q) => ({ ...q, answer: answered[q.id] ?? null })),
    endsAt: new Date(a.endsAt).toISOString(),
    serverNow: new Date().toISOString(),
    durationSeconds: APTITUDE_DURATION_SECONDS,
  };
};

/**
 * Enregistre des réponses (au fil de l'eau ou en fin de test).
 * `final` clôt le test ; passé l'échéance (+ 1 min de tolérance réseau), le test est clos
 * avec les réponses déjà enregistrées et les nouvelles sont ignorées.
 */
export const submitAptitudeAnswers = async (
  _: any,
  { token, answers, final }: { token: string; answers: { questionId: string; choice: number }[]; final?: boolean }
) => {
  const s = await getSessionByToken(token);
  const a = s.aptitude;
  if (!a?.startedAt) throw new UserInputError("Le test n'a pas commencé.");
  if (a.submittedAt) return { finished: true, answered: (a.answers || []).length, total: a.questionCodes.length };

  const expired = isExpired(s);
  if (!expired) {
    const map = new Map((a.answers || []).map((x) => [x.questionCode, x.choice]));
    for (const ans of answers || []) {
      const idx = Number(ans.questionId);
      if (!Number.isInteger(idx) || idx < 0 || idx >= a.questionCodes.length) continue;
      if (!Number.isInteger(ans.choice) || ans.choice < 0 || ans.choice > 3) continue;
      map.set(String(idx), ans.choice);
    }
    a.answers = [...map.entries()].map(([questionCode, choice]) => ({ questionCode, choice }));
    s.markModified("aptitude");
  }
  if (final || expired || Date.now() > new Date(a.endsAt).getTime()) finalize(s);
  await s.save();
  return { finished: !!s.aptitude?.submittedAt, answered: (s.aptitude?.answers || []).length, total: a.questionCodes.length };
};
