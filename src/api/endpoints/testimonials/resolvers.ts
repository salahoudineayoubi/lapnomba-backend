import { TestimonialModel } from "../../../models/testimonial";

export const testimonialResolvers = {
  Query: {
    testimonials: async () => TestimonialModel.find().lean(),
    testimonial: async (_: any, { id }: { id: string }) =>
      TestimonialModel.findById(id).lean(),
  },
  Mutation: {
    createTestimonial: async (
      _: any,
      { titre, description, video }: any
    ) => {
      const testimonial = new TestimonialModel({ titre, description, video });
      return (await testimonial.save()).toObject();
    },

    updateTestimonial: async (
      _: any,
      { id, ...fields }: any
    ) => {
      const testimonial = await TestimonialModel.findByIdAndUpdate(id, fields, { new: true });
      if (!testimonial) throw new Error("Témoignage non trouvé");
      return testimonial.toObject();
    },

    deleteTestimonial: async (_: any, { id }: { id: string }) => {
      const result = await TestimonialModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};