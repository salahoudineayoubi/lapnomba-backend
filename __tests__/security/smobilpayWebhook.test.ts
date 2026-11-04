jest.mock("../../src/models/donor", () => ({ DonationModel: { findOne: jest.fn() } }));
jest.mock("../../src/models/acdemy/payment", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../../src/api/endpoints/donateur/endpoints/financia/completion", () => ({ confirmDonationPayment: jest.fn() }));
jest.mock("../../src/services/academyPayment/academyPayment.service", () => ({ confirmAcademyPaymentWithProvider: jest.fn() }));
jest.mock("../../src/utils/logger", () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { DonationModel } from "../../src/models/donor";
import { confirmDonationPayment } from "../../src/api/endpoints/donateur/endpoints/financia/completion";
import { handleSmobilpayWebhook } from "../../src/services/smobilpay/smobilpay.webhook.service";

describe("webhook Smobilpay", () => {
  it("ignore le statut envoyé et revérifie chez Smobilpay", async () => {
    const donation = { _id: "d1", save: jest.fn() };
    (DonationModel.findOne as jest.Mock).mockResolvedValue(donation);
    // Smobilpay dit en réalité PENDING, même si le webhook prétend COMPLETED.
    (confirmDonationPayment as jest.Mock).mockResolvedValue({ status: "PENDING" });

    const result = await handleSmobilpayWebhook({ reference: "REF-1", status: "COMPLETED" });

    expect(confirmDonationPayment).toHaveBeenCalledWith("d1");
    expect(result).toEqual({ matched: true, type: "donation", status: "PENDING" });
  });
});
