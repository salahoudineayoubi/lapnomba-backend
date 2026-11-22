/**
 * Actions admin : l'e-mail part en arrière-plan, la mutation répond sans
 * attendre le serveur SMTP, et un échec d'envoi est seulement journalisé.
 */
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn() }));
jest.mock("../../src/utils/logger", () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock("../../src/utils/emailSupport", () => ({
  buildSupportFooterHtml: () => "",
  buildSupportFooterText: () => "",
}));
jest.mock("../../src/services/textTranslation", () => ({
  hasAllLanguages: jest.fn(() => true),
  mergeTranslations: jest.fn(),
  runTranslationInBackground: jest.fn(),
  translateShortTexts: jest.fn(),
}));
jest.mock("../../src/services/campaignTranslation", () => ({ getTranslationClient: jest.fn(() => null) }));
jest.mock("../../src/models/communityvoice", () => ({
  CommunityVoiceModel: { findByIdAndUpdate: jest.fn(), findById: jest.fn(), findByIdAndDelete: jest.fn() },
}));
jest.mock("../../src/models/psychosocial", () => ({
  __esModule: true,
  default: { findByIdAndUpdate: jest.fn(), find: jest.fn(), create: jest.fn() },
}));

import { sendMail } from "../../src/utils/sendMail";
import logger from "../../src/utils/logger";
import { CommunityVoiceModel } from "../../src/models/communityvoice";
import Psychosocial from "../../src/models/psychosocial";
import { isApprovedStatut, isRefusedStatut, sendMailInBackground } from "../../src/api/endpoints/backgroundMail";
import { communityVoiceResolvers } from "../../src/api/endpoints/communityVoice/resolver";
import { psychosocialResolvers } from "../../src/api/endpoints/psychosocial/resolvers";

const mockedSendMail = sendMail as jest.Mock;
const neverSettles = () => new Promise(() => {});

beforeEach(() => jest.clearAllMocks());

describe("sendMailInBackground", () => {
  it("ne rejette jamais et journalise l'échec SMTP", async () => {
    mockedSendMail.mockRejectedValueOnce(new Error("SMTP indisponible"));
    await expect(sendMailInBackground("Test", { to: "a@b.c", subject: "Sujet", text: "x" })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("SMTP indisponible"));
  });

  it("capture aussi une erreur levée de façon synchrone (configuration absente)", async () => {
    mockedSendMail.mockImplementationOnce(() => {
      throw new Error("SMTP non configuré");
    });
    await expect(sendMailInBackground("Test", { to: "a@b.c", subject: "Sujet" })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("isApprovedStatut / isRefusedStatut", () => {
  it.each(["approuvé", "approuvée", "Approuvée", "approuve"])("%s = approuvé", (s) => expect(isApprovedStatut(s)).toBe(true));
  it.each(["refusé", "refusée", "REFUSÉ"])("%s = refusé", (s) => expect(isRefusedStatut(s)).toBe(true));
  it("en attente n'est ni l'un ni l'autre", () => {
    expect(isApprovedStatut("en attente")).toBe(false);
    expect(isRefusedStatut("en attente")).toBe(false);
  });
});

describe("approveVoice", () => {
  it("répond sans attendre l'envoi de l'e-mail", async () => {
    (CommunityVoiceModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ email: "x@y.z", name: "Awa", isApproved: true });
    mockedSendMail.mockImplementationOnce(neverSettles);

    const result = await communityVoiceResolvers.Mutation.approveVoice(null, { id: "v1" });

    expect(result).toEqual({ success: true, message: "Avis approuvé et publié !" });
    // Le microtask de l'envoi s'exécute après la réponse.
    await Promise.resolve();
    expect(mockedSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "x@y.z" }));
  });
});

describe("applyVoiceRewrite", () => {
  it("publie sans attendre l'e-mail d'approbation", async () => {
    const voice: any = {
      comment: "ancien",
      isApproved: false,
      email: "x@y.z",
      name: "Awa",
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
    (CommunityVoiceModel.findById as jest.Mock).mockResolvedValueOnce(voice);
    mockedSendMail.mockImplementationOnce(neverSettles);

    const result = await communityVoiceResolvers.Mutation.applyVoiceRewrite(null, { id: "v1", comment: "nouveau", publish: true });

    expect(result).toEqual({ success: true, message: "Avis corrigé et publié." });
    expect(voice.isApproved).toBe(true);
    await Promise.resolve();
    expect(mockedSendMail).toHaveBeenCalledTimes(1);
  });
});

describe("updatePsychosocialStatus", () => {
  it("envoie l'e-mail d'approbation pour le statut « approuvé » enregistré par l'admin", async () => {
    (Psychosocial.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ email: "x@y.z", nomComplet: "Awa", statut: "approuvé" });
    mockedSendMail.mockImplementationOnce(neverSettles);

    const res = await psychosocialResolvers.Mutation.updatePsychosocialStatus(null, { id: "p1", statut: "approuvé" });

    expect(res).toEqual(expect.objectContaining({ statut: "approuvé" }));
    await Promise.resolve();
    expect(mockedSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "x@y.z" }));
  });
});
