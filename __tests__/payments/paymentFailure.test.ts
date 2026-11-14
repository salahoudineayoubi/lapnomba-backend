import { extractPaymentFailureReason } from "../../src/services/smobilpay/paymentFailure";

describe("extractPaymentFailureReason", () => {
  it("ne renvoie rien pour un paiement réussi ou en attente", () => {
    expect(extractPaymentFailureReason({ status: "SUCCESS" }, "COMPLETED")).toBeNull();
    expect(extractPaymentFailureReason({ status: "PENDING" }, "PENDING")).toBeNull();
  });

  it.each([
    [{ status: "FAILED", errorMessage: "Invalid PIN entered by subscriber" }, "WRONG_PIN"],
    [{ status: "FAILED", message: "Code secret incorrect" }, "WRONG_PIN"],
    [{ status: "ERRORED", data: { reason: "Insufficient balance" } }, "INSUFFICIENT_FUNDS"],
    [{ status: "FAILED", message: "Solde insuffisant" }, "INSUFFICIENT_FUNDS"],
    [{ status: "FAILED", reason: "Transaction limit exceeded" }, "LIMIT_EXCEEDED"],
    [{ status: "FAILED", errorMessage: "Subscriber not registered" }, "INVALID_ACCOUNT"],
    [{ status: "FAILED", errorMessage: "Transaction expired: not confirmed by customer" }, "EXPIRED"],
    [{ status: "REJECTED" }, "REJECTED"],
    [{ status: "FAILED" }, "UNKNOWN"],
  ])("classe %j en %s", (response, expected) => {
    expect(extractPaymentFailureReason(response, "FAILED")).toBe(expected);
  });

  it("un paiement annulé sans détail est considéré refusé par le client", () => {
    expect(extractPaymentFailureReason({ status: "CANCELLED" }, "CANCELED")).toBe("REJECTED");
  });

  it("ignore la description (message libre du donateur)", () => {
    expect(
      extractPaymentFailureReason({ status: "FAILED", description: "Pour dépasser la limite de la pauvreté" }, "FAILED")
    ).toBe("UNKNOWN");
  });
});
