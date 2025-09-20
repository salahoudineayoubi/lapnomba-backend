import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProductCharacteristicType = "number" | "string";

export interface IProductCharacteristic extends Document {
  name: string;
  value: string;
  type: ProductCharacteristicType;
  description?: string;
  products?: Types.ObjectId[]; // Références à Product
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductCharacteristicSchema = new Schema<IProductCharacteristic>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    type: { type: String, enum: ["number", "string"], default: "string", required: true },
    description: { type: String },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  {
    timestamps: true,
  }
);

// Index unique sur (name, value)
ProductCharacteristicSchema.index({ name: 1, value: 1 }, { unique: true });

export const ProductCharacteristicModel = mongoose.model<IProductCharacteristic>(
  'ProductCharacteristic',
  ProductCharacteristicSchema
);