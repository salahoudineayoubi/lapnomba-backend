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
}

const CandidatureSchema = new Schema<ICandidature>({
  nomComplet: { type: String, required: true },
  dateNaissance: { type: String, required: true },
  sexe: { type: String, required: true },
  adresse: { type: String, required: true },
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
}, { timestamps: true });

// Filtrage fréquent par statut (liste admin, stats) et exclusion des
// candidatures "supprimées" (soft-delete) des requêtes courantes.
CandidatureSchema.index({ statut: 1, createdAt: -1 });
CandidatureSchema.index({ deletedAt: 1 });

export default model<ICandidature>("Candidature", CandidatureSchema);