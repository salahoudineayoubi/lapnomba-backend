import { Schema, Document, model } from "mongoose";

export interface IStatusHistoryEntry {
  from: string;
  to: string;
  changedAt: Date;
  changedBy: string;
}

export interface ICandidature extends Document {
  nomComplet: string;
  dateNaissance: string;
  sexe: string;
  adresse: string;
  ville: string;
  pays: string;
  numeroWhatsapp: string;
  email: string;
  photo?: string;

  niveauScolaire?: string;
  filiere?: string;
  ecole?: string;
  competences?: string;
  cv?: string;

  choixFormation: string;
  pourquoiFormation: string;
  ancienZaguina?: string;
  experienceZaguina?: string;
  typeFormation?: string;

  ordinateur?: string;
  niveauInformatique?: string;
  competencesCles?: string;
  accesInternet?: string;
  frequenceUtilisation?: string;

  consentementDonnees?: boolean;
  consentementDonneesAt?: Date;
  autorisationParentale?: boolean;

  // AJOUT DU CHAMP STATUT
  statut: "en attente" | "approuvée" | "refusée";

  // Raison de refus, transmise par l'admin, optionnelle. Injectée dans l'email
  // de refus si fournie. Ne pas confondre avec une note interne (non ajoutée
  // faute de besoin identifié pour le moment).
  motifRefus?: string;

  // Historique minimal des décisions (qui / quand / ancien → nouveau statut).
  statusHistory: IStatusHistoryEntry[];

  // Soft-delete : la suppression physique est remplacée par un marquage,
  // pour conserver une trace des candidatures retirées.
  deletedAt?: Date;
  deletedBy?: string;

  // ---- Admissions v2 (parcours de sélection) ----
  applicationVersion?: number;
  reference?: string;
  quartier?: string;
  nationalite?: string;
  choixFormation2?: string;
  motivationMetier?: string;
  motivationProbleme?: string;
  motivationEngagement?: string;
  disponibiliteHeures?: number;
  lienProfil?: string;
  identite?: {
    typePiece: string;
    numeroHash?: string;
    numeroFin?: string;
    documents: { front?: string; back?: string; selfie?: string; guardian?: string; birth?: string };
    statut: "a_verifier" | "verifiee" | "rejetee";
    note?: string;
    verifieePar?: string;
    verifieeLe?: Date;
    purgedAt?: Date;
  };
  aptitude?: { score: number; total: number; pourcentage: number; dureeSecondes?: number; termineLe?: Date };
  charte?: { nomSaisi: string; signeeLe: Date };
  scoreGlobal?: number;
}

const CandidatureSchema = new Schema<ICandidature>({
  nomComplet: { type: String, required: true },
  dateNaissance: { type: String, required: true },
  sexe: { type: String, required: true },
  // Facultative en v2 (remplacée par ville + quartier : l'adresse exacte n'est pas demandée).
  adresse: { type: String },
  ville: { type: String, required: true },
  pays: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  photo: { type: String },

  niveauScolaire: { type: String },
  filiere: { type: String },
  ecole: { type: String },
  competences: { type: String },
  cv: { type: String },

  choixFormation: { type: String, required: true },
  pourquoiFormation: { type: String, required: true },
  ancienZaguina: { type: String },
  experienceZaguina: { type: String },
  typeFormation: { type: String },

  ordinateur: { type: String },
  niveauInformatique: { type: String },
  competencesCles: { type: String },
  accesInternet: { type: String },
  frequenceUtilisation: { type: String },

  // Consentements recueillis par le formulaire d'admission
  consentementDonnees: { type: Boolean },
  consentementDonneesAt: { type: Date },
  autorisationParentale: { type: Boolean },

  // CONFIGURATION DU STATUT
  statut: {
    type: String,
    enum: ["en attente", "approuvée", "refusée"],
    default: "en attente", // Indispensable pour que les nouveaux s'affichent
    required: true
  },

  motifRefus: { type: String, trim: true, maxlength: 2000 },

  statusHistory: {
    type: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        changedBy: { type: String, required: true },
        _id: false,
      },
    ],
    default: [],
  },

  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },

  // ---- Admissions v2 ----
  applicationVersion: { type: Number },
  reference: { type: String, index: { unique: true, sparse: true } },
  quartier: { type: String, trim: true },
  nationalite: { type: String, trim: true },
  choixFormation2: { type: String, trim: true },
  motivationMetier: { type: String, maxlength: 1500 },
  motivationProbleme: { type: String, maxlength: 1500 },
  motivationEngagement: { type: String, maxlength: 1500 },
  disponibiliteHeures: { type: Number },
  lienProfil: { type: String, trim: true },
  identite: {
    typePiece: String,
    // Empreinte HMAC du numéro (dédoublonnage) + 4 derniers chiffres : le numéro complet n'est jamais stocké.
    numeroHash: { type: String, index: true },
    numeroFin: String,
    documents: { front: String, back: String, selfie: String, guardian: String, birth: String },
    statut: { type: String, enum: ["a_verifier", "verifiee", "rejetee"] },
    note: { type: String, maxlength: 1000 },
    verifieePar: String,
    verifieeLe: Date,
    purgedAt: Date,
  },
  aptitude: { score: Number, total: Number, pourcentage: Number, dureeSecondes: Number, termineLe: Date },
  charte: { nomSaisi: String, signeeLe: Date },
  scoreGlobal: { type: Number, index: true },
}, { timestamps: true });

// Filtrage fréquent par statut (liste admin, stats) et exclusion des
// candidatures "supprimées" (soft-delete) des requêtes courantes.
CandidatureSchema.index({ statut: 1, createdAt: -1 });
CandidatureSchema.index({ deletedAt: 1 });

export default model<ICandidature>("Candidature", CandidatureSchema);