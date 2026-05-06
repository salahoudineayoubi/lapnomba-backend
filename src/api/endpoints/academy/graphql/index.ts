import { gql } from "apollo-server-express";

import { academyProgramTypeDefs } from "./program";
import { academyApplicationTypeDefs } from "./application";
import { academyEnrollmentTypeDefs } from "./enrollment";
import { academyPaymentTypeDefs } from "./payment";
import { academyGroupTypeDefs } from "./groupe";
import { academyProgressTypeDefs } from "./progress";
import { academyStatsTypeDefs } from "./stats";

const academyBaseTypeDefs = gql`
  type Query {
    _academy: String
  }

  type Mutation {
    _academy: String
  }
`;

export const academyTypeDefs = [
  academyBaseTypeDefs,
  academyProgramTypeDefs,
  academyApplicationTypeDefs,
  academyEnrollmentTypeDefs,
  academyPaymentTypeDefs,
  academyGroupTypeDefs,
  academyProgressTypeDefs,
  academyStatsTypeDefs,
];