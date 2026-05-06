// models/academyGroup.ts
import { Schema, Document, model, models, Types } from "mongoose";

export interface IAcademyGroup extends Document {
  name: string;
  selectedTrack: string;
  level?: string;
  trainingMode: "online" | "hybrid";

  whatsappLink: string;

  maxStudents: number;
  currentStudents: number;

  startDate?: Date;
  endDate?: Date;

  trainerIds?: Types.ObjectId[];

  isActive: boolean;
}

const AcademyGroupSchema = new Schema<IAcademyGroup>(
  {
    name: { type: String, required: true, trim: true },
    selectedTrack: { type: String, required: true },
    level: { type: String },

    trainingMode: {
      type: String,
      enum: ["online", "hybrid"],
      required: true,
    },

    whatsappLink: { type: String, required: true },

    maxStudents: { type: Number, default: 100 },
    currentStudents: { type: Number, default: 0 },

    startDate: { type: Date },
    endDate: { type: Date },

    trainerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AcademyGroupSchema.index({ selectedTrack: 1, trainingMode: 1, isActive: 1 });

export default models.AcademyGroup ||
  model<IAcademyGroup>("AcademyGroup", AcademyGroupSchema);