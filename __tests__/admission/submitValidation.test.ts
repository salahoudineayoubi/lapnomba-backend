/**
 * Admissions v2 — chaque règle de validation de createCandidatureV2, une par une.
 * (le site n'est qu'une aide : c'est le serveur qui doit tout refuser)
 */
const saved: any[] = [];
let session: any;

jest.mock("../../src/api/endpoints/admission/session", () => {
  const actual = jest.requireActual("../../src/api/endpoints/admission/session");
  return { ...actual, getSessionByToken: jest.fn(async () => session) };
});
jest.mock("../../src/models/candidature", () => {
  const Model: any = jest.fn().mockImplementation((data: any) => ({ ...data, _id: "cand1", save: jest.fn(async function (this: any) { saved.push(this); return this; }) }));
  Model.exists = jest.fn().mockResolvedValue(null);
  return { __esModule: true, default: Model };
});
jest.mock("../../src/models/acdemy/program", () => ({
  __esModule: true,
  default: { exists: jest.fn(async (q: any) => (String(q.$or[0].title).includes("Inconnue") ? null : { _id: "p" })) },
}));
jest.mock("../../src/utils/privateFiles", () => ({ uploadPrivateDataUri: jest.fn().mockResolvedValue("private:raw:pdf:cv") }));

import Candidature from "../../src/models/candidature";
import { createCandidatureV2 } from "../../src/api/endpoints/admission/submit";

const yearsAgo = (y: number, extraDays = 10) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(d.getDate() - extraDays);
  return d.toISOString().slice(0, 10);
};
const txt = (sujet: string) =>
  `Je veux apprendre ${sujet} parce que dans mon quartier à Yaoundé beaucoup de jeunes perdent leur temps et certains tombent dans la cyberarnaque. Depuis deux ans je regarde des vidéos le soir, j'ai construit une petite page pour la boutique de ma tante et je veux aller plus loin avec une formation encadrée.`;

const baseInput = () => ({
  sessionToken: "tok",
  email: "pirate@autre.com",
  nomComplet: "Ngo Bassa Awa",
  dateNaissance: yearsAgo(21),
  sexe: "Femme",
  numeroWhatsapp: "+237677000000",
  pays: "CM",
  nationalite: "CM",
  ville: "Yaoundé",
  quartier: "Essos",
  typePiece: "CNI",
  numeroPiece: "20170590799910554",
  niveauScolaire: "Bac",
  ecole: "Lycée Leclerc",
  choixFormation: "Développement Web & Mobile",
  motivationMetier: txt("le développement web"),
  motivationProbleme: txt("à résoudre les paiements").replace("Je veux", "Il faut"),
  motivationEngagement: txt("avec sérieux").replace("Je veux", "Je promets"),
  disponibiliteHeures: 20,
  consentementDonnees: true,
  charteNom: "ngo bassa AWA",
});

const freshSession = () => ({
  _id: "sess1",
  email: "awa@gmail.com",
  verifiedAt: new Date(Date.now() - 30 * 60 * 1000),
  documents: { front: "private:image:jpg:f", back: "private:image:jpg:b", selfie: "private:image:jpg:s" },
  aptitude: { submittedAt: new Date(), score: 12, total: 15, durationSeconds: 900 },
  save: jest.fn(),
});

const expectReject = async (patch: any, re: RegExp, sessionPatch: any = {}) => {
  session = { ...freshSession(), ...sessionPatch };
  await expect(createCandidatureV2({ ...baseInput(), ...patch })).rejects.toThrow(re);
  expect(saved).toHaveLength(0);
};

beforeEach(() => {
  saved.length = 0;
  (Candidature as any).exists.mockResolvedValue(null);
});

describe("createCandidatureV2 — cas valide", () => {
  it("crée la candidature : e-mail de la session (pas celui du formulaire), référence, score, pièce hachée", async () => {
    session = freshSession();
    const { candidature } = (await createCandidatureV2(baseInput())) as any;
    expect(saved).toHaveLength(1);
    expect(candidature.email).toBe("awa@gmail.com");
    expect(candidature.reference).toMatch(/^LNF-\d{2}-[A-Z2-9]{6}$/);
    expect(candidature.aptitude.pourcentage).toBe(80);
    expect(candidature.scoreGlobal).toBeGreaterThan(50);
    expect(candidature.identite.numeroFin).toBe("0554");
    expect(JSON.stringify(candidature)).not.toContain("20170590799910554");
    expect(candidature.identite.statut).toBe("a_verifier");
    expect(session.submittedCandidatureId).toBe("cand1");
  });
});

describe("createCandidatureV2 — refus", () => {
  it("session déjà envoyée", () => expectReject({}, /déjà été envoyée/, { submittedCandidatureId: "x" }));
  it("champ piège rempli", () => expectReject({ website: "spam" }, /refusée/));
  it("envoi trop rapide (< 4 min après vérification)", () => expectReject({}, /Prenez le temps/, { verifiedAt: new Date() }));
  it("nom en un seul mot", () => expectReject({ nomComplet: "Awa", charteNom: "Awa" }, /nom complet/));
  it("date de naissance invalide", () => expectReject({ dateNaissance: "2099-01-01" }, /.+/));
  it("moins de 16 ans", () => expectReject({ dateNaissance: yearsAgo(15) }, /16 ans/));
  it("plus de 25 ans → orientation Academy", () => expectReject({ dateNaissance: yearsAgo(27) }, /age limit/));
  it("téléphone invalide", () => expectReject({ numeroWhatsapp: "abc" }, /WhatsApp/));
  it("quartier manquant", () => expectReject({ quartier: "" }, /quartier/i));
  it("type de pièce inconnu", () => expectReject({ typePiece: "PERMIS" }, /Type de pièce/));
  it("acte de naissance refusé après 18 ans", () => expectReject({ typePiece: "ACTE_NAISSANCE", numeroPiece: "AB12345" }, /18 ans/));
  it("numéro de CNI invalide", () => expectReject({ numeroPiece: "12AB" }, /CNI invalide/));
  it("pièce déjà utilisée par une autre candidature", async () => {
    (Candidature as any).exists.mockResolvedValueOnce({ _id: "autre" });
    await expectReject({}, /existe déjà avec cette pièce/);
  });
  it("verso manquant pour une CNI", () => expectReject({}, /verso/, { documents: { front: "f", selfie: "s" } }));
  it("selfie manquant", () => expectReject({}, /selfie/, { documents: { front: "f", back: "b" } }));
  it("mineur sans pièce du parent", () =>
    expectReject({ dateNaissance: yearsAgo(17), autorisationParentale: true }, /parent ou tuteur/));
  it("mineur sans autorisation parentale", () =>
    expectReject({ dateNaissance: yearsAgo(17) }, /autorisation/, { documents: { front: "f", back: "b", selfie: "s", guardian: "g" } }));
  it("formation inconnue", () => expectReject({ choixFormation: "Formation Inconnue" }, /inconnue/i));
  it("second choix identique au premier", () => expectReject({ choixFormation2: "Développement Web & Mobile" }, /différent/));
  it("motivation trop courte", () => expectReject({ motivationMetier: "Je veux apprendre." }, /150 caractères/));
  it("motivation bourrée (mêmes mots répétés)", () =>
    expectReject({ motivationMetier: "test ".repeat(60) }, /vraie réponse/));
  it("motivation en chiffres / symboles", () =>
    expectReject({ motivationMetier: "1234567890 ".repeat(20) + "abc" }, /vraie réponse/));
  it("trois réponses identiques", () => {
    const t = txt("le web");
    return expectReject({ motivationMetier: t, motivationProbleme: t, motivationEngagement: t }, /différente/);
  });
  it("disponibilité invalide", () => expectReject({ disponibiliteHeures: 0 }, /disponibilité/));
  it("lien de profil invalide", () => expectReject({ lienProfil: "javascript:alert(1)" }, /Lien de profil/));
  it("test d'aptitude non terminé", () => expectReject({}, /test d'aptitude/, { aptitude: { startedAt: new Date() } }));
  it("consentement données absent", () => expectReject({ consentementDonnees: false }, /traitement de vos données/));
  it("charte signée avec un autre nom", () => expectReject({ charteNom: "Jean Dupont" }, /charte/));
  it("CV qui n'est pas un PDF", () => expectReject({ cv: "data:application/pdf;base64,aGVsbG8=" }, /CV/));
});
