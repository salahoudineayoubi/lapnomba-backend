/**
 * Motif lisible d'un paiement Mobile Money refusé (code secret faux, solde
 * insuffisant…), déduit de la réponse de statut Smobilpay.
 *
 * Smobilpay / les opérateurs (MTN MoMo, Orange Money) ne renvoient pas un
 * format unique : on lit les champs texte et code connus, puis on classe par
 * mots-clés. Le frontend traduit ce motif en message clair pour le client.
 * La réponse brute reste journalisée pour affiner la liste au besoin.
 * (`description` n'est pas lu : Smobilpay peut y renvoyer le message du donateur.)
 */
export type PaymentFailureReason =
  | "WRONG_PIN"
  | "INSUFFICIENT_FUNDS"
  | "LIMIT_EXCEEDED"
  | "INVALID_ACCOUNT"
  | "EXPIRED"
  | "REJECTED"
  | "UNKNOWN";

const TEXT_FIELDS = [
  "errorCode",
  "errorMessage",
  "error",
  "errors",
  "message",
  "reason",
  "statusMessage",
  "statusDescription",
  "failureReason",
  "responseMessage",
  "responseCode",
  "status",
  "paymentStatus",
  "transactionStatus",
];

const collectText = (data: any, depth = 0): string[] => {
  if (!data || typeof data !== "object" || depth > 3) return [];
  const out: string[] = [];
  for (const key of TEXT_FIELDS) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    out.push(typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  for (const nested of ["data", "transaction", "payment", "order", "result"]) {
    out.push(...collectText(data[nested], depth + 1));
  }
  return out;
};

const RULES: Array<[PaymentFailureReason, RegExp]> = [
  [
    "WRONG_PIN",
    /\bpin\b|code secret|secret code|mot de passe|password|passcode|authenticat|wrong.?code|invalid.?code|code.?(invalide|incorrect)/i,
  ],
  [
    "INSUFFICIENT_FUNDS",
    /insufficient|insuffisant|not.?enough|low.?(balance|funds)|\bbalance\b|\bsolde\b|NOT_ENOUGH_FUNDS/i,
  ],
  ["LIMIT_EXCEEDED", /limit|plafond|threshold|maximum.?(amount|transactions)/i],
  [
    "INVALID_ACCOUNT",
    /not.?registered|unknown.?(subscriber|account|number|msisdn)|invalid.?(msisdn|number|account|phone|subscriber)|account.?(not.?found|inactive|blocked|suspended)|payer.?not.?found/i,
  ],
  ["EXPIRED", /time.?out|expired|expir|not.?confirmed|no.?response|d[ée]lai/i],
  ["REJECTED", /reject|declin|cancel|annul|refus/i],
];

export const extractPaymentFailureReason = (
  providerResponse: any,
  internalStatus: string
): PaymentFailureReason | null => {
  const status = (internalStatus || "").toUpperCase();
  if (status !== "FAILED" && status !== "CANCELED") return null;

  const text = collectText(providerResponse).join(" | ");
  for (const [reason, pattern] of RULES) {
    if (pattern.test(text)) return reason;
  }
  return status === "CANCELED" ? "REJECTED" : "UNKNOWN";
};
