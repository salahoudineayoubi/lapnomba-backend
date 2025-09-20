import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserPhone {
  value: string;
  dialCode: string;
  countryCode: string;
}

export interface IUser extends Document {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: IUserPhone; // <-- optionnel
  address?: string;
  password: string;
  roles: string[]; // ['customer', 'supplier', 'forwarder']
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    phone: {
      type: new Schema<IUserPhone>(
        {
          value: { type: String, required: true },
          dialCode: { type: String, required: true },
          countryCode: { type: String, required: true }
        },
        { _id: false }
      ),
      required: false // <-- optionnel
    },
    address: { type: String },
    password: { type: String, required: true },
    roles: { type: [String], default: ['customer'] }, // customer par défaut
  },
  { timestamps: true }
);

// Hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = mongoose.model<IUser>('User', UserSchema);