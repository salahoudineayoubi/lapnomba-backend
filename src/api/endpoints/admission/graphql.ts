import { gql } from "apollo-server-express";

export const admissionTypeDefs = gql`
  type ApplicationDocumentsStatus {
    front: Boolean!
    back: Boolean!
    selfie: Boolean!
    guardian: Boolean!
    birth: Boolean!
  }

  type ApplicationSessionState {
    email: String!
    draft: String
    documents: ApplicationDocumentsStatus!
    "NOT_STARTED | IN_PROGRESS | DONE"
    aptitudeStatus: String!
    aptitudeEndsAt: String
    submitted: Boolean!
    verifiedAt: String
  }

  type AptitudeQuestion {
    id: ID!
    category: String!
    prompt: String!
    choices: [String!]!
    "Réponse déjà enregistrée (reprise après coupure)"
    answer: Int
  }

  type AptitudeTest {
    questions: [AptitudeQuestion!]!
    endsAt: String!
    serverNow: String!
    durationSeconds: Int!
  }

  type AptitudeProgress {
    finished: Boolean!
    answered: Int!
    total: Int!
  }

  input AptitudeAnswerInput {
    questionId: ID!
    choice: Int!
  }

  type ApplicationTracking {
    reference: String!
    statut: String!
    choixFormation: String
    createdAt: String!
    prenom: String!
    identiteVerifiee: Boolean!
  }

  # ---- Vue admin de la vérification d'identité (liens signés, 10 min)
  type IdentityDocumentLinks {
    front: String
    back: String
    selfie: String
    guardian: String
    birth: String
  }

  type CandidatureIdentite {
    typePiece: String!
    numeroFin: String
    statut: String!
    note: String
    verifieePar: String
    verifieeLe: String
    purgee: Boolean!
    documents: IdentityDocumentLinks!
  }

  type CandidatureAptitude {
    score: Int!
    total: Int!
    pourcentage: Int!
    dureeSecondes: Int
  }

  extend type Candidature {
    applicationVersion: Int
    reference: String
    quartier: String
    nationalite: String
    choixFormation2: String
    motivationMetier: String
    motivationProbleme: String
    motivationEngagement: String
    disponibiliteHeures: Int
    lienProfil: String
    identite: CandidatureIdentite
    aptitude: CandidatureAptitude
    charteSigneeLe: String
    scoreGlobal: Int
  }

  extend type Query {
    "Public (jeton de session) : état de la candidature en cours"
    applicationSession(token: String!): ApplicationSessionState!
    "Public : suivi d'une candidature envoyée (n° de dossier + e-mail)"
    applicationTracking(reference: String!, email: String!): ApplicationTracking
  }

  extend type Mutation {
    "Public : envoie un code à 6 chiffres (anti-robot + e-mails jetables refusés). website = champ piège."
    requestApplicationCode(email: String!, captchaToken: String, website: String): Boolean!
    "Public : renvoie un jeton de session si le code est bon"
    verifyApplicationCode(email: String!, code: String!): String!
    saveApplicationDraft(token: String!, draft: String!): Boolean!
    "kind : front | back | selfie | guardian | birth — image JPEG/PNG/WebP (data URI), stockée en privé"
    uploadIdentityDocument(token: String!, kind: String!, file: String!): Boolean!
    startAptitudeTest(token: String!): AptitudeTest!
    submitAptitudeAnswers(token: String!, answers: [AptitudeAnswerInput!]!, final: Boolean): AptitudeProgress!

    "Admin : décision sur la pièce d'identité (statut : verifiee | rejetee)"
    verifierIdentiteCandidature(id: ID!, statut: String!, note: String): Candidature!
  }
`;
