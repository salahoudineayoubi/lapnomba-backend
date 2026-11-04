jest.mock("../../src/models/donor", () => ({ DonationModel: {}, providerFromPaymentMethod: jest.fn() }));
jest.mock("../../src/models/crowdfunding_campaign", () => ({ CrowdfundingCampaignModel: {} }));

import {
  ensureValidDonationAmount,
  ensureValidMobileMoneyPhone,
} from "../../src/api/endpoints/donateur/endpoints/financia/helpers";

describe("validation des dons (serveur)", () => {
  it("accepte un don valide en XAF", () => {
    expect(() => ensureValidDonationAmount(5000, "xaf")).not.toThrow();
  });

  it("refuse les autres devises", () => {
    expect(() => ensureValidDonationAmount(5000, "EUR")).toThrow(/Devise/);
  });

  it("refuse les montants hors limites ou décimaux", () => {
    expect(() => ensureValidDonationAmount(100, "XAF")).toThrow();
    expect(() => ensureValidDonationAmount(20_000_000, "XAF")).toThrow();
    expect(() => ensureValidDonationAmount(1500.5, "XAF")).toThrow();
  });

  it("exige un mobile camerounais pour MoMo / Orange Money", () => {
    expect(() => ensureValidMobileMoneyPhone("MOMO", "+237 677 12 34 56")).not.toThrow();
    expect(() => ensureValidMobileMoneyPhone("ORANGE_MONEY", "222123456")).toThrow();
    expect(() => ensureValidMobileMoneyPhone("MOMO", undefined)).toThrow();
    expect(() => ensureValidMobileMoneyPhone("CARD", undefined)).not.toThrow();
  });
});
