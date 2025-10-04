import { AppDataSource } from "../../../data-source";
import { NewsletterSubscribe } from "../../../models/newsletter_subscribe";

const newsletterRepo = AppDataSource.getRepository(NewsletterSubscribe);

export const newsletterResolvers = {
  Query: {
    newsletterSubscribers: async () => newsletterRepo.find(),
    newsletterSubscriber: async (_: any, { id }: { id: number }) =>
      newsletterRepo.findOne({ where: { id } }),
  },
  Mutation: {
    createNewsletterSubscriber: async (_: any, { email }: { email: string }) => {
      const subscription = newsletterRepo.create({ email });
      return newsletterRepo.save(subscription);
    },
    updateNewsletterSubscriber: async (_: any, { id, email }: { id: number; email: string }) => {
      const subscriber = await newsletterRepo.findOne({ where: { id } });
      if (!subscriber) throw new Error("Abonné non trouvé");
      subscriber.email = email;
      return newsletterRepo.save(subscriber);
    },
    deleteNewsletterSubscriber: async (_: any, { id }: { id: number }) => {
      const result = await newsletterRepo.delete(id);
      return result.affected !== 0;
    },
  },
};