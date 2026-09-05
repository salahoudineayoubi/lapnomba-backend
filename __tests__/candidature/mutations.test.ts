/**
 * Tests des resolvers candidature — entièrement mockés (modèle Mongoose +
 * transport email). Aucune connexion réseau, aucune base de données réelle,
 * aucun email réel n'est jamais déclenché par ce fichier.
 */

const mockConstructor = jest.fn();

jest.mock("../../src/models/candidature", () => {
  const ctor: any = jest.fn().mockImplementation((data: any) => {
    mockConstructor(data);
    return {
      ...data,
      save: jest.fn().mockResolvedValue(undefined),
    };
  });
  ctor.findOneAndUpdate = jest.fn();
  ctor.findById = jest.fn();
  ctor.find = jest.fn();
  ctor.countDocuments = jest.fn();
  ctor.aggregate = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../../src/utils/sendMail", () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: "mock-message-id" }),
  verifySmtpConnection: jest.fn().mockResolvedValue(true),
}));

import Candidature from "../../src/models/candidature";
import { sendMail } from "../../src/utils/sendMail";
import {
  createCandidature,
  approuverCandidature,
  refuserCandidature,
  deleteCandidature,
} from "../../src/api/endpoints/candidature/mutation/candidature.mutations";
import { candidatures } from "../../src/api/endpoints/candidature/mutation/candidature.queries";

const MockedCandidature = Candidature as unknown as {
  findOneAndUpdate: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
  aggregate: jest.Mock;
};
const mockedSendMail = sendMail as jest.Mock;

const adminContext = { admin: { email: "admin@lapnomba.org", role: "admin" as const } };
const anonymousContext = { admin: null };

const validInput = {
  nomComplet: "Jean Dupont",
  dateNaissance: "1998-01-01",
  sexe: "M",
  adresse: "Rue 12",
  ville: "Douala",
  pays: "Cameroun",
  numeroWhatsapp: "+237672018999",
  email: "Jean.Dupont@Example.COM",
  choixFormation: "Développement web",
  pourquoiFormation: "Je veux apprendre à coder pour changer complètement de carrière.",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createCandidature (public)", () => {
  it("1. crée une candidature valide", async () => {
    const candidature = await createCandidature(null, { input: validInput });

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(candidature.statut).toBe("en attente");
    expect(mockedSendMail).toHaveBeenCalledTimes(1);
    expect(mockedSendMail.mock.calls[0][0].subject).toMatch(/Accusé de réception/);
  });

  it("2. normalise l'email en lowercase avant sauvegarde", async () => {
    await createCandidature(null, { input: validInput });

    expect(mockConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jean.dupont@example.com" })
    );
  });

  it("3. bloque un doublon d'email (erreur Mongo 11000)", async () => {
    (Candidature as unknown as jest.Mock).mockImplementationOnce(() => ({
      save: jest.fn().mockRejectedValue(Object.assign(new Error("duplicate"), { code: 11000 })),
    }));

    await expect(createCandidature(null, { input: validInput })).rejects.toThrow(
      "Cet email est déjà enregistré."
    );
    expect(mockedSendMail).not.toHaveBeenCalled();
  });

  it("rejette une entrée invalide avant tout accès base (email invalide)", async () => {
    await expect(
      createCandidature(null, { input: { ...validInput, email: "pas-un-email" } })
    ).rejects.toThrow("Adresse email invalide.");

    expect(mockConstructor).not.toHaveBeenCalled();
  });
});

describe("candidatures (admin only)", () => {
  it("4. refuse un accès non authentifié", async () => {
    await expect(candidatures(null, {}, anonymousContext as any)).rejects.toThrow();
    expect(MockedCandidature.find).not.toHaveBeenCalled();
  });

  it("5. autorise un admin authentifié", async () => {
    MockedCandidature.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    await expect(candidatures(null, {}, adminContext as any)).resolves.toEqual([]);
    expect(MockedCandidature.find).toHaveBeenCalledWith({ deletedAt: null });
  });
});

describe("approuverCandidature (admin only)", () => {
  const pendingId = "cand-1";

  it("6. approuve une candidature 'en attente'", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce({
      _id: pendingId,
      email: "jean@example.com",
      nomComplet: "Jean Dupont",
      statut: "approuvée",
    });

    const result = await approuverCandidature(null, { id: pendingId }, adminContext as any);

    expect(result.statut).toBe("approuvée");
    expect(MockedCandidature.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: pendingId, statut: "en attente", deletedAt: null },
      expect.objectContaining({ $set: expect.objectContaining({ statut: "approuvée" }) }),
      { new: true }
    );
  });

  it("7. déclenche un seul email d'approbation", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce({
      _id: pendingId,
      email: "jean@example.com",
      nomComplet: "Jean Dupont",
      statut: "approuvée",
    });

    await approuverCandidature(null, { id: pendingId }, adminContext as any);

    expect(mockedSendMail).toHaveBeenCalledTimes(1);
    expect(mockedSendMail.mock.calls[0][0].subject).toMatch(/Validation de votre candidature/);
  });

  it("8. bloque une deuxième approbation (déjà traitée)", async () => {
    // Le 2e appel simule la course : findOneAndUpdate ne matche plus rien.
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce(null);
    MockedCandidature.findById.mockResolvedValueOnce({
      _id: pendingId,
      statut: "approuvée",
      deletedAt: null,
    });

    await expect(
      approuverCandidature(null, { id: pendingId }, adminContext as any)
    ).rejects.toThrow("La candidature a déjà été approuvée.");

    expect(mockedSendMail).not.toHaveBeenCalled();
  });

  it("9. bloque un refus après approbation", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce(null);
    MockedCandidature.findById.mockResolvedValueOnce({
      _id: pendingId,
      statut: "approuvée",
      deletedAt: null,
    });

    await expect(
      refuserCandidature(null, { id: pendingId }, adminContext as any)
    ).rejects.toThrow(
      "Une candidature déjà approuvée ne peut pas être refusée sans procédure de réouverture."
    );

    expect(mockedSendMail).not.toHaveBeenCalled();
  });

  it("15. un échec SMTP ne fait pas échouer/rollback l'approbation", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce({
      _id: pendingId,
      email: "jean@example.com",
      nomComplet: "Jean Dupont",
      statut: "approuvée",
    });
    mockedSendMail.mockRejectedValueOnce(new Error("SMTP indisponible"));

    // sendStatusEmail capture l'erreur en interne : la mutation ne doit pas
    // rejeter, et le statut renvoyé reste "approuvée".
    const result = await approuverCandidature(null, { id: pendingId }, adminContext as any);
    expect(result.statut).toBe("approuvée");
  });

  it("refuse un accès non authentifié", async () => {
    await expect(
      approuverCandidature(null, { id: pendingId }, anonymousContext as any)
    ).rejects.toThrow();
    expect(MockedCandidature.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("refuserCandidature (admin only)", () => {
  it("10. refuse une candidature 'en attente'", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce({
      _id: "cand-2",
      email: "jean@example.com",
      nomComplet: "Jean Dupont",
      statut: "refusée",
      motifRefus: "Profil non retenu pour cette session.",
    });

    const result = await refuserCandidature(
      null,
      { id: "cand-2", motifRefus: "Profil non retenu pour cette session." },
      adminContext as any
    );

    expect(result.statut).toBe("refusée");
    expect(mockedSendMail).toHaveBeenCalledTimes(1);
    expect(mockedSendMail.mock.calls[0][0].html).toMatch(/Profil non retenu pour cette session\./);
  });
});

describe("deleteCandidature (admin only, soft-delete)", () => {
  it("marque la candidature comme supprimée sans la retirer physiquement", async () => {
    MockedCandidature.findOneAndUpdate.mockResolvedValueOnce({ _id: "cand-3" });

    const result = await deleteCandidature(null, { id: "cand-3" }, adminContext as any);

    expect(result).toBe(true);
    expect(MockedCandidature.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "cand-3", deletedAt: null },
      expect.objectContaining({
        $set: expect.objectContaining({ deletedBy: "admin@lapnomba.org" }),
      }),
      { new: true }
    );
  });

  it("refuse un accès non authentifié", async () => {
    await expect(deleteCandidature(null, { id: "cand-3" }, anonymousContext as any)).rejects.toThrow();
  });
});
