import { studentTypeDefs } from "./students/graphql";
import { studentResolvers } from "./students/resolvers";
import { adminTypeDefs } from "./admin/graphql";
import { adminResolvers } from "./admin/resolvers";
import { projectSummitTypeDefs } from "./projet_summit/graphql";
import { projectSummitResolvers } from "./projet_summit/resolvers";
import { newsletterTypeDefs } from "./newsletter/graphql";
import { newsletterResolvers } from "./newsletter/resolvers";
import { joinTeamRequestTypeDefs } from "./joint_team_request/graphql";
import { joinTeamRequestResolvers } from "./joint_team_request/resolvers";
import { donateurTypeDefs } from "./donateur/graphql";
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
import { rootTypeDefs } from "../endpoints/root";

export const typeDefs = [
  rootTypeDefs,
  studentTypeDefs,
  adminTypeDefs,
  projectSummitTypeDefs,
  newsletterTypeDefs,
  joinTeamRequestTypeDefs,
  donateurTypeDefs,
  testimonialTypeDefs,
  chatbotTypeDefs,
  candidatureTypeDefs,
  ambassadorTypeDefs,
  PsychosocialTypeDefs,
  awarenessTypeDefs
];

export const resolvers = [
  studentResolvers,
  adminResolvers,
  projectSummitResolvers,
  newsletterResolvers,
  joinTeamRequestResolvers,
  donateurResolvers,
  testimonialResolvers,
  chatbotResolvers,
  candidatureResolvers,
  ambassadorResolvers,
  psychosocialResolvers,
  awarenessResolvers
];