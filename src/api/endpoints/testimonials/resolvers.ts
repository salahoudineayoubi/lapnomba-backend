import { TestimonialModel, LocalizedText } from "../../../models/testimonial";

const LANGS = ["fr", "en", "tr", "ar"] as const;

/** Garde uniquement les traductions non vides (fr | en | tr | ar). */
export const cleanLocalized = (value: any): LocalizedText | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const out: LocalizedText = {};
  for (const lang of LANGS) {
    const text = typeof value[lang] === "string" ? value[lang].trim() : "";
    if (text) out[lang] = text;
  }
  return Object.keys(out).length ? out : undefined;
};

export const testimonialResolvers = {
  Query: {
    testimonials: async () => TestimonialModel.find().sort({ createdAt: -1 }).lean(),
    testimonial: async (_: any, { id }: { id: string }) =>
      TestimonialModel.findById(id).lean(),
  },
  Mutation: {
    createTestimonial: async (
      _: any,
      { titre, description, video, poster, titreI18n, descriptionI18n }: any
    ) => {
      const testimonial = new TestimonialModel({
        titre,
        description,
        video,
        poster: poster || undefined,
        titreI18n: cleanLocalized(titreI18n),
        descriptionI18n: cleanLocalized(descriptionI18n),
      });
      return (await testimonial.save()).toObject();
    },

    updateTestimonial: async (
      _: any,
      { id, ...fields }: any
    ) => {
      // Les champs vides envoyés par le formulaire admin ne doivent pas écraser
      // les valeurs existantes (titre, description, vidéo obligatoires).
      const update: Record<string, unknown> = {};
      for (const key of ["titre", "description", "video", "poster"] as const) {
        if (typeof fields[key] === "string" && fields[key].trim()) update[key] = fields[key].trim();
      }
      if (fields.titreI18n !== undefined) update.titreI18n = cleanLocalized(fields.titreI18n);
      if (fields.descriptionI18n !== undefined) update.descriptionI18n = cleanLocalized(fields.descriptionI18n);
      const testimonial = await TestimonialModel.findByIdAndUpdate(id, update, { new: true });
      if (!testimonial) throw new Error("Témoignage non trouvé");
      return testimonial.toObject();
    },

    deleteTestimonial: async (_: any, { id }: { id: string }) => {
      const result = await TestimonialModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};