import mongoose from "mongoose";
import config from "./config";

export const connectMongo = async () => {
  try {
    await mongoose.connect(config.db.uri, {
      user: config.db.user,
      pass: config.db.pass,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};