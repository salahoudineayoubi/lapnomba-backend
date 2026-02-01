import { gql } from "apollo-server-express";

export const donateurTypeDefs = gql`
  enum DonationCategory { FINANCIAL MATERIAL SPONSORSHIP CROWDFUNDING }
  enum PaymentMethod { MOMO ORANGE_MONEY CARD PAYPAL CRYPTO BANK_TRANSFER CASH }
  enum PaymentStatus { PENDING COMPLETED FAILED CANCELED REFUNDED }

  # Nouveau type pour les détails bancaires
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
    bankTransfer: BankTransferInfo
    campaignId: ID
    createdAt: String!
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
  }

  type MaterialDonation {
    id: ID!
    donorName: String!
    itemType: String!
    quantity: Int!
    status: String!
    createdAt: String!
  }

  type Sponsorship {
    id: ID!
    sponsorName: String!
    studentName: String
    status: String!
    createdAt: String!
  }

  type PayPalOrderResponse {
    donationId: ID!
    orderId: String!
    approveUrl: String
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
  }

  input CreateMaterialDonationInput {
    donorName: String!
    itemType: String!
    quantity: Int!
  }

  input CreateSponsorshipInput {
    sponsorName: String!
    studentName: String
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
  }

  input DonateToCampaignInput {
    campaignSlug: String!
    donorName: String!
    donorEmail: String!
    amount: Float!
    paymentMethod: PaymentMethod!
    anonymous: Boolean
  }

  type Query {
    donations: [Donation!]!
    crowdfundingCampaigns(limit: Int): [CrowdfundingCampaign!]!
    campaignBySlug(slug: String!): CrowdfundingCampaign
    donationById(id: ID!): Donation
  }

  type Mutation {
    createCampaign(input: CreateCampaignInput!): CrowdfundingCampaign!
    donateToCampaign(input: DonateToCampaignInput!): Donation!
    createFinancialDonation(input: CreateFinancialDonationInput!): Donation!
    createPayPalOrderForDonation(donationId: ID!): PayPalOrderResponse!
    capturePayPalDonation(orderId: String!): Donation!        
    createMaterialDonation(input: CreateMaterialDonationInput!): MaterialDonation!
    createSponsorship(input: CreateSponsorshipInput!): Sponsorship!
    createBankTransferDonation(input: CreateBankTransferDonationInput!): Donation!
    markBankTransferAsCompleted(donationId: ID!): Donation!
    markBankTransferAsFailed(donationId: ID!): Donation!
    deleteDonation(id: ID!): Boolean
  }
`;