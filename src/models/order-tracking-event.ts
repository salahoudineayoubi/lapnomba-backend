import mongoose, { Document, Schema, Types } from 'mongoose';
import type { OrderStatus } from './order';

export interface IOrderTrackingEvent extends Document {
  orderId: Types.ObjectId; 
  status: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderTrackingEventSchema = new Schema<IOrderTrackingEvent>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "canceled", "shipped", "delivered"],
      required: true,
    },
  },
  { timestamps: true }
);

export const OrderTrackingEventModel = mongoose.model<IOrderTrackingEvent>(
  'OrderTrackingEvent',
  OrderTrackingEventSchema
);