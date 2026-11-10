/**
 * Standardisation des communications — en-têtes email (From/Reply-To),
 * pied de page support, et migration du numéro WhatsApp.
 *
 * `nodemailer` est mocké (aucune connexion réseau réelle), mais
 * `utils/sendMail` et les helpers d'emails candidat/interne sont réels :
 * on vérifie le message effectivement construit, pas un mock de haut niveau
 * qui masquerait un bug de configuration From/Reply-To.
 */

const mockTransporterSendMail = jest.fn().mockResolvedValue({ messageId: "mock-id" });

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockTransporterSendMail,
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

// Modèle mocké uniquement pour permettre l'import de receipt.ts (getSupportContact
// y est utilisé) sans toucher Mongo — non utilisé directement dans ces tests.
jest.mock("../../src/models/donor", () => ({
  DonationModel: { updateOne: jest.fn() },
}));

// Représentatif des autres workflows découverts pendant l'audit (awareness,
// psychosocial, ambassador, communityVoice partagent tous le même schéma
// From/Reply-To/pied de page — testé une fois ici plutôt que dupliqué 4x).
jest.mock("../../src/models/awarenessAgent", () => ({
  __esModule: true,
  default: {
    create: jest.fn((data: any) => Promise.resolve({ ...data })),
  },
}));

beforeEach(() => {
  mockTransporterSendMail.mockClear();

  process.env.SMTP_HOST = "smtp.test.local";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "auth-mailbox@example.com"; // identité d'authentification ≠ From
  process.env.SMTP_PASS = "test-pass";
  process.env.SMTP_FROM_NAME = "Lap Nomba Foundation";
  process.env.SMTP_FROM_EMAIL = "noreply@lapnomba.org";
  process.env.SUPPORT_EMAIL = "contact@lapnomba.org";
  process.env.SUPPORT_WHATSAPP = "+237657588317";
  process.env.TRAINING_NOTIFICATION_EMAIL = "training@lapnomba.org";
});

import { getSupportContact, getDefaultReplyTo } from "../../src/utils/emailSupport";
import { sendStatusEmail, sendInternalNotification } from "../../src/api/endpoints/candidature/mutation/candidature.helpers";
import { awarenessResolvers } from "../../src/api/endpoints/awareness/resolvers";

const lastCall = () => mockTransporterSendMail.mock.calls[mockTransporterSendMail.mock.calls.length - 1][0];

describe("emailSupport — contact centralisé", () => {
  it("expose le bon email et le bon numéro WhatsApp (affichage + lien wa.me)", () => {
    const contact = getSupportContact();

    expect(contact.email).toBe("contact@lapnomba.org");
    expect(contact.whatsappDisplay).toBe("+237 657 588 317");
    expect(contact.whatsappDigits).toBe("237657588317");
    expect(contact.whatsappLink).toBe("https://wa.me/237657588317");
    // Jamais de "+", espace ou tiret dans le lien wa.me
    expect(contact.whatsappLink).not.toMatch(/[+\s-]/);
  });

  it("Reply-To par défaut pointe vers le support, pas vers noreply", () => {
    expect(getDefaultReplyTo()).toBe("Lap Nomba Support <contact@lapnomba.org>");
  });
});

describe("Emails candidat (confirmation/approbation/refus) — architecture From/Reply-To", () => {
  it("CONFIRMATION : From noreply, Reply-To support, pied de page support présent", async () => {
    await sendStatusEmail("candidat@example.com", "Jean Dupont", "CONFIRMATION");

    const call = lastCall();
    expect(call.from).toBe('"Lap Nomba Foundation" <noreply@lapnomba.org>');
    expect(call.replyTo).toBe("Lap Nomba Support <contact@lapnomba.org>");
    expect(call.to).toBe("candidat@example.com");
    expect(call.html).toContain("contact@lapnomba.org");
    expect(call.html).toContain("+237 657 588 317");
    expect(call.text).toContain("contact@lapnomba.org");
  });

  it("APPROBATION : From noreply, Reply-To support, lien WhatsApp migré vers le nouveau numéro", async () => {
    await sendStatusEmail("candidat@example.com", "Jean Dupont", "APPROBATION");

    const call = lastCall();
    expect(call.from).toBe('"Lap Nomba Foundation" <noreply@lapnomba.org>');
    expect(call.replyTo).toBe("Lap Nomba Support <contact@lapnomba.org>");
    expect(call.html).toContain("https://wa.me/237657588317");
    expect(call.text).toContain("https://wa.me/237657588317");
    // L'ancien numéro ne doit plus apparaître nulle part
    expect(call.html).not.toContain("237672018999");
    expect(call.text).not.toContain("237672018999");
  });

  it("REFUS : From noreply, Reply-To support, pied de page support présent", async () => {
    await sendStatusEmail("candidat@example.com", "Jean Dupont", "REFUS");

    const call = lastCall();
    expect(call.from).toBe('"Lap Nomba Foundation" <noreply@lapnomba.org>');
    expect(call.replyTo).toBe("Lap Nomba Support <contact@lapnomba.org>");
    expect(call.html).toContain("contact@lapnomba.org");
  });
});

describe("Notification interne (équipe formation)", () => {
  const candidature = {
    _id: "abc123",
    nomComplet: "Awa Ngo",
    choixFormation: "Développement web",
    ville: "Douala",
    pays: "Cameroun",
    email: "awa.ngo@example.com",
    numeroWhatsapp: "+237690112233",
    createdAt: new Date("2026-01-15T10:00:00Z"),
  };

  it("part de noreply@, part vers training@ (jamais support@ par erreur), Reply-To support", async () => {
    await sendInternalNotification(candidature, 20);

    const call = lastCall();
    expect(call.from).toBe('"Lap Nomba Foundation" <noreply@lapnomba.org>');
    expect(call.to).toBe("training@lapnomba.org");
    expect(call.to).not.toBe("contact@lapnomba.org");
    expect(call.replyTo).toBe("Lap Nomba Support <contact@lapnomba.org>");
  });

  it("reste concise — pas de pied de page support commercial (voir politique notifications internes)", async () => {
    await sendInternalNotification(candidature, 20);

    const call = lastCall();
    expect(call.html).not.toContain("Besoin d'aide ?");
    expect(call.text).not.toContain("Besoin d'aide ?");
  });
});

describe("Autres workflows automatiques (représentatif : Awareness) — même politique From/Reply-To", () => {
  it("createAwarenessAgent envoie un email confirmé noreply/support avec pied de page", async () => {
    await awarenessResolvers.Mutation.createAwarenessAgent(null, {
      input: {
        nomComplet: "Fatima Bello",
        email: "fatima.bello@example.com",
        zoneIntervention: "Garoua",
      },
    });

    const call = lastCall();
    expect(call.from).toBe('"Lap Nomba Foundation" <noreply@lapnomba.org>');
    expect(call.replyTo).toBe("Lap Nomba Support <contact@lapnomba.org>");
    expect(call.to).toBe("fatima.bello@example.com");
    expect(call.html).toContain("contact@lapnomba.org");
    expect(call.html).toContain("+237 657 588 317");
  });
});
