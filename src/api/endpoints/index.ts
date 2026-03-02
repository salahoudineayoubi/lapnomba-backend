
import { adminTypeDefs } from "./admin/graphql";
import { adminResolvers } from "./admin/resolvers";
import { projectSummitTypeDefs } from "./projet_summit/graphql";
import {communityVoiceTypeDefs} from "./communityVoice/graphql";
import { newsletterTypeDefs } from "./newsletter/graphql";
import { newsletterResolvers } from "./newsletter/resolvers";
import {ICommunityVoice } from "../../models/communityvoice";
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
import { partnerTypeDefs } from "../endpoints/partners/graphql";
import { partnerResolvers } from "./partners/resolvers";
import { developerTypeDefs } from "./developer/graphql";
import { developerResolvers } from "./developer/resolvers";
import { communityVoiceResolvers } from "./communityVoice/resolver";
import { materialTypeDefs } from "./material/graphql";
import { materialResolvers } from "./material/resolvers";

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
  materialTypeDefs
];

export const resolvers = [
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
  materialResolvers
];