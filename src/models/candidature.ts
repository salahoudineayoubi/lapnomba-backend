import { Schema, Document, model } from "mongoose";

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
}

const CandidatureSchema = new Schema<ICandidature>({
  nomComplet: { type: String, required: true },
  dateNaissance: { type: String, required: true },
  sexe: { type: String, required: true },
  adresse: { type: String, required: true },
  ville: { type: String, required: true },
  pays: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true },
  email: { type: String, required: true, unique: true },
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
}, { timestamps: true });

export default model<ICandidature>("Candidature", CandidatureSchema);