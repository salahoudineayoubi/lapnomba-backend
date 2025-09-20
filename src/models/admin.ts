import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAdmin extends Document {
  userId: Types.ObjectId; // Référence à User
  role: 'superadmin' | 'moderator'; // Tu peux gérer plusieurs niveaux
  permissions?: string[]; // Ex: ['manageUsers', 'manageOrders', 'managePayments']
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['superadmin', 'moderator'], default: 'moderator' },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export const AdminModel = mongoose.model<IAdmin>('Admin', AdminSchema);
