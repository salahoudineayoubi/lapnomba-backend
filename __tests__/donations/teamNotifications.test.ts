jest.mock("../../src/utils/sendMail", () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: "mock" }),
}));
jest.mock("../../src/models/crowdfunding_campaign", () => ({
  CrowdfundingCampaignModel: {
    findById: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve({ title: "Ordinateurs pour Foumban" }) }) })),
  },
}));

import { sendMail } from "../../src/utils/sendMail";
import {
  notifyTeamDonationCompleted,
  notifyTeamMaterialDonation,
  notifyTeamSponsorship,
} from "../../src/api/endpoints/donateur/endpoints/financia/notifications/team";

const mocked = sendMail as jest.Mock;
const flush = () => new Promise((r) => setImmediate(r));

describe("notifications équipe dons (donate@lapnomba.org)", () => {
  beforeEach(() => {
    mocked.mockClear();
    delete process.env.DONATION_NOTIFICATION_EMAIL;
    delete process.env.ADMIN_APP_URL;
  });

  it("don confirmé : email à donate@ avec montant, donateur, campagne et lien admin", async () => {
    await notifyTeamDonationCompleted({
      _id: "abc", amount: 5000, currency: "XAF", donorName: "Awa", donorEmail: "awa@example.com",
      paymentMethod: "MOMO", category: "CROWDFUNDING", campaignId: "c1", providerReference: "REF-1", paidAt: new Date(),
    });
    await flush();
    expect(mocked).toHaveBeenCalledTimes(1);
    const m = mocked.mock.calls[0][0];
    expect(m.to).toBe("donate@lapnomba.org");
    expect(m.subject).toMatch(/^\[Dons\]/);
    expect(m.subject).toContain("Awa");
    expect(m.html).toContain("Ordinateurs pour Foumban");
    expect(m.html).toContain("MTN Mobile Money");
    expect(m.html).toContain("https://admin.lapnomba.org/admin/financialdonation");
    expect(m.text).toContain("REF-1");
  });

  it("don anonyme : l'équipe voit le nom, marqué « souhaite rester anonyme »", async () => {
    await notifyTeamDonationCompleted({ amount: 1000, currency: "XAF", donorName: "Paul", anonymous: true });
    await flush();
    expect(mocked.mock.calls[0][0].text).toContain("Paul (souhaite rester anonyme)");
  });

  it("échappe le HTML fourni par le donateur", async () => {
    await notifyTeamDonationCompleted({ amount: 1000, currency: "XAF", donorName: "<script>x</script>", message: "<b>hi</b>" });
    await flush();
    const html = mocked.mock.calls[0][0].html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("respecte DONATION_NOTIFICATION_EMAIL et ADMIN_APP_URL", async () => {
    process.env.DONATION_NOTIFICATION_EMAIL = "test@lapnomba.org";
    process.env.ADMIN_APP_URL = "https://admin.example.org/";
    notifyTeamMaterialDonation({ itemType: "Ordinateur portable", quantity: 3, donorName: "Société X" });
    await flush();
    const m = mocked.mock.calls[0][0];
    expect(m.to).toBe("test@lapnomba.org");
    expect(m.html).toContain("https://admin.example.org/admin/materials");
    expect(m.subject).toContain("3 × Ordinateur portable");
  });

  it("parrainage : email à donate@", async () => {
    notifyTeamSponsorship({ sponsorName: "Mme Ngo", amount: 20000, currency: "XAF", studentName: "Ibrahim" });
    await flush();
    const m = mocked.mock.calls[0][0];
    expect(m.to).toBe("donate@lapnomba.org");
    expect(m.subject).toMatch(/^\[Parrainage\]/);
    expect(m.html).toContain("Ibrahim");
  });

  it("une erreur SMTP ne remonte jamais (non bloquant)", async () => {
    mocked.mockRejectedValueOnce(new Error("SMTP down"));
    await expect(notifyTeamDonationCompleted({ amount: 1, currency: "XAF", donorName: "A" })).resolves.toBeUndefined();
    await flush();
  });
});
