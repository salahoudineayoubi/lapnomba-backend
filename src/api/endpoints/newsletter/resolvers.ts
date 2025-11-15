import { NewsletterSubscribeModel } from "../../../models/newsletter_subscribe";

export const newsletterResolvers = {
  Query: {
    newsletterSubscribers: async () => NewsletterSubscribeModel.find().lean(),
    newsletterSubscriber: async (_: any, { id }: { id: string }) =>
      NewsletterSubscribeModel.findById(id).lean(),
  },
  Mutation: {
    createNewsletterSubscriber: async (_: any, { email }: { email: string }) => {
      const subscription = new NewsletterSubscribeModel({ email });
      return (await subscription.save()).toObject();
    },
    updateNewsletterSubscriber: async (_: any, { id, email }: { id: string; email: string }) => {
      const subscriber = await NewsletterSubscribeModel.findByIdAndUpdate(
        id,
        { email },
        { new: true }
      );
      if (!subscriber) throw new Error("Abonné non trouvé");
      return subscriber.toObject();
    },
    deleteNewsletterSubscriber: async (_: any, { id }: { id: string }) => {
      const result = await NewsletterSubscribeModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};