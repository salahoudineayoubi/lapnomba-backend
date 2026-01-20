import { DonationModel } from "../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";
import { paypalCreateOrder, paypalCaptureOrder } from "../../../../utils/paypal";
// import { momoCreateOrder, momoCaptureOrder } from "../../../../utils/momo"; // À implémenter
// import { cryptoCreateOrder, cryptoCaptureOrder } from "../../../../utils/crypto"; // À implémenter

export const financialDonationResolvers = {
  Query: {
    donationById: async (_: any, { id }: any) => {
      return DonationModel.findById(id);
    },
  },

  Mutation: {
    // 1. Création d'un don financier (tous moyens de paiement)
    createFinancialDonation: async (_: any, { input }: any) => {
      const donation = await DonationModel.create({
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        anonymous: input.anonymous ?? false,

        category: "FINANCIAL",
        amount: input.amount,
        currency: input.currency ?? "XAF",
        message: input.message,
        futureContact: input.futureContact ?? false,

        paymentMethod: input.paymentMethod,
        status: "PENDING",
        provider: input.paymentMethod,
      });

      return donation;
    },

    // 2. PayPal: créer order
    createPayPalOrderForDonation: async (_: any, { donationId }: any) => {
      const donation = await DonationModel.findById(donationId);
      if (!donation) throw new Error("Donation introuvable.");
      if (donation.paymentMethod !== "PAYPAL") throw new Error("Cette donation n'est pas en mode PAYPAL.");

      const { orderId, approveUrl } = await paypalCreateOrder({
        amount: donation.amount,
        currency: donation.currency,
        donationId: donation.id,
      });

      donation.providerOrderId = orderId;
      donation.status = "PENDING";
      await donation.save();

      return { donationId: donation.id, orderId, approveUrl };
    },

    // 3. PayPal: capture
    capturePayPalDonation: async (_: any, { orderId }: any) => {
      const donation = await DonationModel.findOne({ providerOrderId: orderId, provider: "PAYPAL" });
      if (!donation) throw new Error("Donation PayPal introuvable.");

      const capture = await paypalCaptureOrder(orderId);

      donation.providerCaptureId = capture.captureId;
      donation.status = capture.status === "COMPLETED" ? "COMPLETED" : "FAILED";
      await donation.save();

      // Si lié à une campagne, incrémente les stats
      if (donation.status === "COMPLETED" && donation.campaignId) {
        await CrowdfundingCampaignModel.updateOne(
          { _id: donation.campaignId },
          { $inc: { totalRaised: donation.amount, donorsCount: 1 } }
        );
      }

      return donation;
    },

    // 4. Donner à une campagne (paiement à la fondation, campaignId attachée)
    donateToCampaign: async (_: any, { input }: any) => {
      const campaign = await CrowdfundingCampaignModel.findOne({ slug: input.campaignSlug.toLowerCase() });
      if (!campaign) throw new Error("Campagne introuvable.");
      if (campaign.status !== "ACTIVE") throw new Error("Campagne non active.");

      const donation = await DonationModel.create({
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        anonymous: input.anonymous ?? false,

        category: "CROWDFUNDING",
        amount: input.amount,
        currency: input.currency ?? campaign.currency,
        message: input.message,
        futureContact: input.futureContact ?? false,

        paymentMethod: input.paymentMethod,
        status: input.paymentMethod === "PAYPAL" ? "PENDING" : "PENDING",
        provider: input.paymentMethod === "PAYPAL" ? "PAYPAL" : input.paymentMethod,

        campaignId: campaign._id,
      });

      return donation;
    },

    // 5. (Placeholders pour autres moyens de paiement)
    // createMomoOrderForDonation: async (_: any, { donationId }: any) => { ... },
    // captureMomoDonation: async (_: any, { transactionId }: any) => { ... },
    // createCardOrderForDonation: async (_: any, { donationId }: any) => { ... },
    // captureCardDonation: async (_: any, { transactionId }: any) => { ... },
    // createCryptoOrderForDonation: async (_: any, { donationId }: any) => { ... },
    // captureCryptoDonation: async (_: any, { transactionId }: any) => { ... },
  }
};