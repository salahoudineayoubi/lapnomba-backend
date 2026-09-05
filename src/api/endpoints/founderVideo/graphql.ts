import { gql } from "apollo-server-express";

export const founderVideoTypeDefs = gql`
  type FounderHistoryVideo {
    videoFr: String
    videoEn: String
    updatedAt: String
  }

  extend type Query {
    # Public — URLs des vidéos "histoire de la fondation" (FR/EN).
    # Peut renvoyer null si aucune vidéo n'a encore été uploadée par l'admin.
    founderHistoryVideo: FounderHistoryVideo
  }
`;
