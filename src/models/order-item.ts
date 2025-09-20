import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderItem extends Document {
  quantity: number;
  price: number;
  orderId: Types.ObjectId;   // Référence à Order
  productId: Types.ObjectId; // Référence à Product
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    quantity: { type: Number, default: 0 },
    price: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
);

export const OrderItemModel = mongoose.model<IOrderItem>('OrderItem', OrderItemSchema);