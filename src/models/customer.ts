import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomer extends Document {
  userId: Types.ObjectId;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model<ICustomer>('Customer', CustomerSchema);
