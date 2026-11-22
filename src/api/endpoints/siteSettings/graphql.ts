import { gql } from "apollo-server-express";

export const siteSettingsTypeDefs = gql`
  "Paramètres du site modifiables depuis l'admin (« Paramètres du site »)."
  type SiteSettings {
    "Numéro WhatsApp support, chiffres seuls avec indicatif (lien wa.me) : 237657588317"
    supportWhatsappDigits: String!
    "Numéro WhatsApp support, format affichage : +237 657 588 317"
    supportWhatsappDisplay: String!
    "Lien wa.me sans message pré-rempli."
    supportWhatsappLink: String!
    "E-mail du support (contact humain)."
    supportEmail: String!
    "true si le numéro vient de l'admin, false s'il s'agit de la valeur par défaut (variable d'environnement ou numéro historique)."
    isCustomized: Boolean!
    "Date de la dernière modification depuis l'admin (ISO 8601)."
    updatedAt: String
    "ADMIN : e-mail de l'admin ayant fait la dernière modification (null pour le public)."
    updatedBy: String
  }

  input SiteSettingsInput {
    "Format international, ex. « +237 657 588 317 » (espaces, tirets, points acceptés ; 8 à 15 chiffres)."
    supportWhatsapp: String!
  }

  extend type Query {
    "Public : contact support officiel (utilisé par tous les sites)."
    siteSettings: SiteSettings!
  }

  extend type Mutation {
    "ADMIN : modifie les paramètres du site."
    updateSiteSettings(input: SiteSettingsInput!): SiteSettings!
  }
`;
