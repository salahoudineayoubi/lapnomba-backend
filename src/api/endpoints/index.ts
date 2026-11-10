import { adminTypeDefs } from "./admin/graphql";
import { adminResolvers } from "./admin/resolvers";

import { projectSummitTypeDefs } from "./projet_summit/graphql";
import { projectSummitResolvers } from "./projet_summit/resolvers";

import { joinTeamRequestTypeDefs } from "./joint_team_request/graphql";
import { joinTeamRequestResolvers } from "./joint_team_request/resolvers";

import { studentTypeDefs } from "./students/graphql";
import { studentResolvers } from "./students/resolvers";

import { communityVoiceTypeDefs } from "./communityVoice/graphql";
import { communityVoiceResolvers } from "./communityVoice/resolver";

import { newsletterTypeDefs } from "./newsletter/graphql";
import { newsletterResolvers } from "./newsletter/resolvers";

import { donateurTypeDefs } from "./donateur/donation.typeDefs";
import { donateurResolvers } from "./donateur/resolvers";

import { testimonialTypeDefs } from "./testimonials/graphql";
import { testimonialResolvers } from "./testimonials/resolvers";

import { chatbotTypeDefs } from "./chat_bot/graphql";
import { chatbotResolvers } from "./chat_bot/resolvers";

import { candidatureTypeDefs } from "./candidature/graphql";
import { candidatureResolvers } from "./candidature/resolvers";

import { ambassadorTypeDefs } from "./ambassador/graphql";
import { ambassadorResolvers } from "./ambassador/resolvers";

import { PsychosocialTypeDefs } from "./psychosocial/graphql";
import { psychosocialResolvers } from "./psychosocial/resolvers";

import { awarenessTypeDefs } from "./awareness/graphql";
import { awarenessResolvers } from "./awareness/resolvers";

import { rootTypeDefs } from "./root";

import { partnerTypeDefs } from "./partners/graphql";
import { partnerResolvers } from "./partners/resolvers";

import { developerTypeDefs } from "./developer/graphql";
import { developerResolvers } from "./developer/resolvers";

import { materialTypeDefs } from "./material/graphql";
import { materialResolvers } from "./material/resolvers";
import { academyTypeDefs } from "./academy/graphql";
import { academyResolvers } from "./academy/resolver";

import { eventTypeDefs } from "./events/graphql";
import { eventResolvers } from "./events/resolvers";

import { founderVideoTypeDefs } from "./founderVideo/graphql";
import { founderVideoResolvers } from "./founderVideo/resolvers";

import { mentorTypeDefs } from "./mentor/graphql";
import { mentorResolvers } from "./mentor/resolvers";

import { talentRequestTypeDefs } from "./talentRequest/graphql";
import { talentRequestResolvers } from "./talentRequest/resolvers";

import { applyAdminGuards, privacyFieldResolvers } from "./accessControl";

export const typeDefs = [
  rootTypeDefs,
  communityVoiceTypeDefs,
  adminTypeDefs,
  projectSummitTypeDefs,
  newsletterTypeDefs,
  donateurTypeDefs,
  testimonialTypeDefs,
  chatbotTypeDefs,
  candidatureTypeDefs,
  ambassadorTypeDefs,
  PsychosocialTypeDefs,
  awarenessTypeDefs,
  partnerTypeDefs,
  developerTypeDefs,
  materialTypeDefs,
  academyTypeDefs,
  eventTypeDefs,
  founderVideoTypeDefs,
  mentorTypeDefs,
  joinTeamRequestTypeDefs,
  studentTypeDefs,
  talentRequestTypeDefs,
];

const rawResolvers = [
  communityVoiceResolvers,
  adminResolvers,
  newsletterResolvers,
  donateurResolvers,
  testimonialResolvers,
  chatbotResolvers,
  candidatureResolvers,
  ambassadorResolvers,
  psychosocialResolvers,
  awarenessResolvers,
  partnerResolvers,
  developerResolvers,
  materialResolvers,
  academyResolvers,
  eventResolvers,
  founderVideoResolvers,
  mentorResolvers,
  projectSummitResolvers,
  joinTeamRequestResolvers,
  studentResolvers,
  talentRequestResolvers,
];

// Toutes les opérations listées dans accessControl.ts exigent un token admin ;
// les coordonnées personnelles sont masquées pour les appels publics.
export const resolvers = [...applyAdminGuards(rawResolvers), privacyFieldResolvers];
