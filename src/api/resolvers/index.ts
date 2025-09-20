import { UserModel } from "../../models/user";
import { CustomerModel } from "../../models/customer";
import { SupplierModel } from "../../models/supplier";
import { ForwarderModel } from "../../models/forwarder";
import { AdminModel } from "../../models/admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../../types/express"; // ton type custom pour req.use

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

const resolvers = {
  Query: {
    users: async (_parent: any, _args: any, context: { user?: any }) => {
      if (!context.user || context.user.role !== "admin") {
        throw new Error("Accès refusé : Admin requis");
      }
      return await UserModel.find();
    },
    user: async (_parent: any, args: { id: string }, context: { user?: any }) => {
      const { id } = args;
      if (!context.user) throw new Error("Non authentifié");
      if (context.user.role !== "admin" && context.user.userId !== id) {
        throw new Error("Accès refusé");
      }
      return await UserModel.findById(id);
    },
    // … même logique pour customers, suppliers, forwarders, admins, me
  },
  Mutation: {
    createUser: async (
      _parent: any,
      args: { input: { firstName: string; lastName?: string; email: string; phone?: string; address?: string; password: string } },
      _context: { user?: any }
    ) => {
      const { firstName, lastName, email, phone, address, password } = args.input;
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) throw new Error("Email déjà utilisé");

      const hashed = await bcrypt.hash(password, 10);
      const newUser = new UserModel({ firstName, lastName, email, phone, address, password: hashed });
      await newUser.save();

      const newCustomer = new CustomerModel({ userId: newUser._id });
      await newCustomer.save();

      return newUser;
    },
    updateUser: async (
      _parent: any,
      args: { id: string; input: any },
      context: { user?: any }
    ) => {
      const { id, input } = args;
      if (!context.user) throw new Error("Non authentifié");
      if (context.user.role !== "admin" && context.user.userId !== id) {
        throw new Error("Accès refusé");
      }

      if (input.password) {
        input.password = await bcrypt.hash(input.password, 10);
      }

      const updated = await UserModel.findByIdAndUpdate(id, input, { new: true });
      return updated;
    },
    deleteUser: async (_parent: any, args: { id: string }, context: { user?: any }) => {
      const { id } = args;
      if (!context.user) throw new Error("Non authentifié");
      if (context.user.role !== "admin" && context.user.userId !== id) {
        throw new Error("Accès refusé");
      }
      await UserModel.findByIdAndDelete(id);
      return true;
    },
    // … login, logout, createSupplier, createForwarder, createAdmin
  },
};

export default resolvers;
