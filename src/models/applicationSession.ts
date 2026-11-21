import { Schema, Document, model } from "mongoose";

/**
 * Session de candidature (admissions v2).
 *
 * Créée par la vérification de l'e-mail (code à 6 chiffres), elle porte le
 * brouillon (reprise sur un autre appareil), les pièces d'identité privées
 * et la tentative unique du test d'aptitude. Une candidature v2 ne peut être
 * créée qu'à partir d'une session vérifiée, test terminé et pièces fournies.
 */
export type IdentityDocKind = "front" | "back" | "selfie" | "guardian" | "birth";

export interface IAptitudeAnswer {
  questionCode: string;
  choice: number;
}

export interface IApplicationSession extends Document {
  email: string;
  codeHash?: string;
  codeExpiresAt?: Date;
  codeAttempts: number;
  codesSent: { at: Date }[];
  verifiedAt?: Date;
  tokenHash?: string;
  tokenExpiresAt?: Date;
  draft?: string;
  documents: Partial<Record<IdentityDocKind, string>>;
  aptitude?: {
    questionCodes: string[];
    startedAt: Date;
    endsAt: Date;
    answers: IAptitudeAnswer[];
    submittedAt?: Date;
    score?: number;
    total?: number;
    durationSeconds?: number;
  };
  submittedCandidatureId?: string;
  ip?: string;
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SESSION_LIFETIME_DAYS = 60;

const ApplicationSessionSchema = new Schema<IApplicationSession>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String },
    codeExpiresAt: { type: Date },
    codeAttempts: { type: Number, default: 0 },
    codesSent: { type: [{ at: { type: Date, required: true }, _id: false }], default: [] },
    verifiedAt: { type: Date },
    tokenHash: { type: String, index: { unique: true, sparse: true } },
    tokenExpiresAt: { type: Date },
    draft: { type: String, maxlength: 60000 },
    documents: {
      front: String,
      back: String,
      selfie: String,
      guardian: String,
      birth: String,
    },
    aptitude: {
      questionCodes: [String],
      startedAt: Date,
      endsAt: Date,
      answers: { type: [{ questionCode: String, choice: Number, _id: false }], default: undefined },
      submittedAt: Date,
      score: Number,
      total: Number,
      durationSeconds: Number,
    },
    submittedCandidatureId: { type: String },
    ip: { type: String },
    // Les sessions abandonnées disparaissent d'elles-mêmes (index TTL) ;
    // leurs fichiers privés sont supprimés par le script de purge.
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 3600 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const ApplicationSession = model<IApplicationSession>("ApplicationSession", ApplicationSessionSchema);
