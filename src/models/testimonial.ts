import mongoose, { Document, Schema } from "mongoose";

export interface ITestimonial extends Document {
  titre: string;
  description: string;
  video: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    titre: { type: String, required: true },
    description: { type: String, required: true },
    video: { type: String, required: true }
  },
  { timestamps: true }
);

export const TestimonialModel = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);