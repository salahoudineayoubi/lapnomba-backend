import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  price: number;
  brand?: string;
  supplierId: Types.ObjectId; 
  productCharacteristics?: Types.ObjectId[]; 
  createdAt?: Date;
  updatedAt?: Date;
}
const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    brand: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    productCharacteristics: [{ type: Schema.Types.ObjectId, ref: 'ProductCharacteristic' }],
  },
  {
    timestamps: true
  }
);

ProductSchema.index({ sku: 1, supplierId: 1 }, { unique: true });

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);