import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPurchaseOrderItem extends Document {
  quantity: number;
  price: number;
  purchaseOrderId: Types.ObjectId; // Référence à PurchaseOrder
  productId: Types.ObjectId;       // Référence à Product
  createdAt?: Date;
  updatedAt?: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    quantity: { type: Number, default: 0 },
    price: { type: Number, required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
);

export const PurchaseOrderItemModel = mongoose.model<IPurchaseOrderItem>('PurchaseOrderItem', PurchaseOrderItemSchema);