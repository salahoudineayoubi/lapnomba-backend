import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISupplier extends Document {
  userId: Types.ObjectId;
  companyName: string;
  contact?: string;
  region?: string;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    contact: { type: String },
    region: { type: String },
  },
  { timestamps: true }
);

export const SupplierModel = mongoose.model<ISupplier>('Supplier', SupplierSchema);
