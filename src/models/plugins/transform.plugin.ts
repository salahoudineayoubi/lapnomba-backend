import { Schema } from "mongoose";

export const transformPlugin = (schema: Schema) => {
  // Transform output JSON
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
      // _id → id
      ret.id = ret._id?.toString();
      delete ret._id;

      // Convert all Date fields to ISO string
      Object.keys(ret).forEach((key) => {
        const value = ret[key];

        if (value instanceof Date) {
          ret[key] = value.toISOString();
        }
      });

      return ret;
    },
  });

  schema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => {
      ret.id = ret._id?.toString();
      delete ret._id;

      Object.keys(ret).forEach((key) => {
        const value = ret[key];

        if (value instanceof Date) {
          ret[key] = value.toISOString();
        }
      });

      return ret;
    },
  });
};