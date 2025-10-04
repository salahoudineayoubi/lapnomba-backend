import { AppDataSource } from "../../../data-source";
import { Testimonial } from "../../../models/testimonial";

const testimonialRepo = AppDataSource.getRepository(Testimonial);

export const testimonialResolvers = {
  Query: {
    testimonials: async () => testimonialRepo.find(),
    testimonial: async (_: any, { id }: { id: number }) =>
      testimonialRepo.findOne({ where: { id } }),
  },
  Mutation: {
    createTestimonial: async (
      _: any,
      { titre, description, video }: any
    ) => {
      const testimonial = testimonialRepo.create({ titre, description, video });
      return testimonialRepo.save(testimonial);
    },

    updateTestimonial: async (
      _: any,
      { id, ...fields }: any
    ) => {
      const testimonial = await testimonialRepo.findOne({ where: { id } });
      if (!testimonial) throw new Error("Témoignage non trouvé");
      Object.assign(testimonial, fields);
      return testimonialRepo.save(testimonial);
    },

    deleteTestimonial: async (_: any, { id }: { id: number }) => {
      const result = await testimonialRepo.delete(id);
      return result.affected !== 0;
    },
  },
};