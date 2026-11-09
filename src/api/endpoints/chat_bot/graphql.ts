import { gql } from "apollo-server-express";

export const chatbotTypeDefs = gql`
  type Query {
    _empty: String
  }

  "Message précédent de la conversation (pour que Pemi AI comprenne les questions de suivi)."
  input ChatTurnInput {
    "user | assistant"
    role: String!
    content: String!
  }

  type Mutation {
    """
    Réponse de Pemi AI. history (facultatif) : derniers échanges, du plus ancien
    au plus récent. language (facultatif) : langue du site (fr | en | tr | ar).
    """
    chatbotPrompt(prompt: String!, history: [ChatTurnInput!], language: String): String!
  }
`;
