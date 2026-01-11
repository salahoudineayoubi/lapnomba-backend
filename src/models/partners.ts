import mongoose, { Schema, Document } from "mongoose";

export interface IPartner extends Document {
  nomOrganisation: string;
  nomFondateur: string;
  emailCandidat: string;
  emailOfficiel: string;
  numeroContact: string;
  posteCandidat: string;
  presentationOrganisation: string;
  domaineAction: string;
  adresse: string;
  ville: string;
  pays: string;
  siteWeb?: string;
  urlLinkedin?: string;
  createdAt: Date;
}

const PartnerSchema: Schema = new Schema(
  {
    nomOrganisation: { type: String, required: true },
    nomFondateur: { type: String, required: true },
    emailCandidat: { type: String, required: true },
    emailOfficiel: { type: String, required: true },
    numeroContact: { type: String, required: true },
    posteCandidat: { type: String, required: true },
    presentationOrganisation: { type: String, required: true },
    domaineAction: { type: String, required: true },
    adresse: { type: String, required: true },
    ville: { type: String, required: true },
    pays: { type: String, required: true },
    siteWeb: { type: String },
    urlLinkedin: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Partner || mongoose.model<IPartner>("Partner", PartnerSchema);