import { gql } from "apollo-server-express";

export const donateurTypeDefs = gql`
  enum DonationCategory {
    FINANCIAL
    MATERIAL
    SPONSORSHIP
    CROWDFUNDING
  }

  enum PaymentMethod {
    MOMO
    ORANGE_MONEY
    CARD
    CRYPTO
    BANK_TRANSFER
    CASH
  }

  enum PaymentStatus {
    PENDING
    COMPLETED
    FAILED
    CANCELED
    REFUNDED
  }

  type BankTransferInfo {
    reference: String
    senderBank: String
    sentAt: String
    proofUrl: String
  }

  type Donation {
    id: ID!
    donorName: String!
    donorEmail: String!
    donorPhone: String
    anonymous: Boolean
    category: DonationCategory!
    amount: Float!
    currency: String!
    message: String
    futureContact: Boolean!
    paymentMethod: PaymentMethod!
    status: PaymentStatus!

    provider: String
    providerOrderId: String
    providerCaptureId: String
    providerTransactionId: String
    providerReference: String
    providerPaymentUrl: String
    providerStatusRaw: String

    bankTransfer: BankTransferInfo
    campaignId: ID
    createdAt: String!
    updatedAt: String!
    paidAt: String
    failedAt: String
  }

  type CrowdfundingCampaign {
    id: ID!
    title: String!
    slug: String!
    goalAmount: Float!
    currency: String!
    story: String
    organizerName: String!
    organizerEmail: String!
    coverImage: String
    totalRaised: Float!
    donorsCount: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type MaterialDonation {
    id: ID!
    donorName: String!
    donorEmail: String
    donorPhone: String
    itemType: String!
    quantity: Int!
    description: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Sponsorship {
    id: ID!
    sponsorName: String!
    sponsorEmail: String
    sponsorPhone: String
    studentName: String
    amount: Float
    currency: String
    message: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type PaymentInitiationResponse {
    donationId: ID!
    provider: String!
    paymentUrl: String
    reference: String
    transactionId: String
    status: PaymentStatus!
    message: String
  }

  input CreateFinancialDonationInput {
    donorName: String!
    donorEmail: String!
    donorPhone: String
    amount: Float!
    currency: String
    paymentMethod: PaymentMethod!
    message: String
    futureContact: Boolean
    anonymous: Boolean
    campaignId: ID
  }

  input CreateMaterialDonationInput {
    donorName: String!
    donorEmail: String
    donorPhone: String
    itemType: String!
    quantity: Int!
    description: String
  }

  input CreateSponsorshipInput {
    sponsorName: String!
    sponsorEmail: String
    sponsorPhone: String
    studentName: String
    amount: Float
    currency: String
    message: String
  }

  input CreateCampaignInput {
    title: String!
    goalAmount: Float!
    currency: String
    story: String
    organizerName: String!
    organizerEmail: String!
    coverImage: String
  }

  input CreateBankTransferDonationInput {
    donorName: String!
    donorEmail: String!
    donorPhone: String
    anonymous: Boolean

    amount: Float!
    currency: String
    message: String
    futureContact: Boolean

    reference: String!
    senderBank: String
    sentAt: String
    proofUrl: String
    campaignId: ID
  }

  input DonateToCampaignInput {
    campaignSlug: String!
    donorName: String!
    donorEmail: String!
    donorPhone: String
    amount: Float!
    currency: String
    paymentMethod: PaymentMethod!
    message: String
    futureContact: Boolean
    anonymous: Boolean
  }

  type Query {
    donations: [Donation!]!
    donationById(id: ID!): Donation

    crowdfundingCampaigns(limit: Int): [CrowdfundingCampaign!]!
    campaignBySlug(slug: String!): CrowdfundingCampaign

    materialDonations: [MaterialDonation!]!
    sponsorships: [Sponsorship!]!
  }

  type Mutation {
    # Campagnes
    createCampaign(input: CreateCampaignInput!): CrowdfundingCampaign!
    donateToCampaign(input: DonateToCampaignInput!): Donation!

    # Dons financiers
    createFinancialDonation(input: CreateFinancialDonationInput!): Donation!
    createBankTransferDonation(input: CreateBankTransferDonationInput!): Donation!

    # Paiement générique (Smobilpay / Maviance)
    initiateDonationPayment(donationId: ID!): PaymentInitiationResponse!
    verifyDonationPayment(donationId: ID!): Donation!

    # Gestion manuelle
    markBankTransferAsCompleted(donationId: ID!): Donation!
    markBankTransferAsFailed(donationId: ID!): Donation!
    deleteDonation(id: ID!): Boolean!

    # Dons matériels / sponsorship
    createMaterialDonation(input: CreateMaterialDonationInput!): MaterialDonation!
    createSponsorship(input: CreateSponsorshipInput!): Sponsorship!
  }
`;