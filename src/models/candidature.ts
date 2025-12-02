import { Schema, Document, model } from "mongoose";

export interface ICandidature extends Document {
  photo?: string;
  sexe: string;
  dateNaissance: string;
  adresse: string;
  ville: string;
  pays: string;
  nomComplet: string;
  numeroWhatsapp: string;
  email: string;
  occupation: string;
  niveauScolaire?: string;
  filiere?: string;
  ecole?: string;
  etudeTerminee?: string;
  besoinStage?: string;
  periodeStage?: string;
  competences?: string;
  cv?: string;
  choixFormation: string;
  pourquoiFormation: string;
  objectifsFormation: string;
  avenir5ans: string;
  ancienZaguina?: string;
  experienceZaguina?: string;
  motivation?: string;
  engagement?: boolean;
  heuresParSemaine?: string;
  typeFormation?: string;
  disponible?: string;
  contraintesDisponibilite?: string;
  ordinateur?: string;
  ordinateurComment?: string;
  internet?: string;
  internetComment?: string;
  smartphone?: string;
  smartphoneComment?: string;
  statut?: string; // <-- Ajout du champ statut
}

const CandidatureSchema = new Schema<ICandidature>({
  photo: String,
  sexe: { type: String, required: true },
  dateNaissance: { type: String, required: true },
  adresse: { type: String, required: true },
  ville: { type: String, required: true },
  pays: { type: String, required: true },
  nomComplet: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  occupation: { type: String, required: true },
  niveauScolaire: String,
  filiere: String,
  ecole: String,
  etudeTerminee: String,
  besoinStage: String,
  periodeStage: String,
  competences: String,
  cv: String,
  choixFormation: { type: String, required: true },
  pourquoiFormation: { type: String, required: true },
  objectifsFormation: { type: String, required: true },
  avenir5ans: { type: String, required: true },
  ancienZaguina: String,
  experienceZaguina: String,
  motivation: String,
  engagement: Boolean,
  heuresParSemaine: String,
  typeFormation: String,
  disponible: String,
  contraintesDisponibilite: String,
  ordinateur: String,
  ordinateurComment: String,
  internet: String,
  internetComment: String,
  smartphone: String,
  smartphoneComment: String,
  statut: { type: String }, // <-- Ajout du champ statut
}, { timestamps: true });

export default model<ICandidature>("Candidature", CandidatureSchema);