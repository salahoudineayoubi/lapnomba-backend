
import {
  academyApplications,
  academyApplicationById,
  academyApplicationStats,
} from "./endpoints/queries";

import {
  createAcademyApplication,
  updateAcademyApplicationStatus,
  updateAcademyPayment,
  deleteAcademyApplication,
} from "./endpoints/mutations";

export const academyResolvers = {
  Query: {
    academyApplications,
    academyApplicationById,
    academyApplicationStats,
  },

  Mutation: {
    createAcademyApplication,
    updateAcademyApplicationStatus,
    updateAcademyPayment,
    deleteAcademyApplication,
  },
};