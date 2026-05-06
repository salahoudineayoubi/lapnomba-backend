import merge from "lodash.merge";

import { academyProgramResolvers } from "./program";
import { academyApplicationResolvers } from "./application";
import { academyEnrollmentResolvers } from "./enrollement";
import { academyPaymentResolvers } from "./payment";
import { academyGroupResolvers } from "./group";
import { academyProgressResolvers } from "./progress";
import { academyStatsResolvers } from "./stats";

export const academyResolvers = merge(
  {},
  academyProgramResolvers,
  academyApplicationResolvers,
  academyEnrollmentResolvers,
  academyPaymentResolvers,
  academyGroupResolvers,
  academyProgressResolvers,
  academyStatsResolvers
);