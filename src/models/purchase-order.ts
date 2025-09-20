import mongoose, { Document, Schema, Types } from 'mongoose';

export type PurchaseOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "canceled";

export interface IPurchaseOrder extends Document {
  orderId: Types.ObjectId; // Référence à Order
  supplierId: Types.ObjectId; // Référence à Supplier
  expectedDate?: Date;
  status: PurchaseOrderStatus;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    expectedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    totalPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

export const PurchaseOrderModel = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);