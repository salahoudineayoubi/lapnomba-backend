import dotenv from "dotenv";
dotenv.config();

import cloudinary from "cloudinary";
import streamifier from "streamifier";

const masked = (v?: string) => v ? (v.length > 6 ? v.slice(0,3) + "..."+ v.slice(-3) : "*****") : "<missing>";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Cloudinary env vars missing:", {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "<missing>",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? masked(process.env.CLOUDINARY_API_KEY) : "<missing>",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? masked(process.env.CLOUDINARY_API_SECRET) : "<missing>",
  });
  throw new Error("Missing Cloudinary configuration in environment. Check .env");
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadFromBase64(
  dataUri: string,
  options: { folder?: string; resource_type?: "image" | "raw" | "auto" } = {}
) {
  const uploadOptions: any = {
    resource_type: options.resource_type || "auto",
    folder: options.folder,
  };
  const res = await cloudinary.v2.uploader.upload(dataUri, uploadOptions);
  return res;
}

export async function uploadBuffer(
  buffer: Buffer,
  filename = "file",
  options: { folder?: string; resource_type?: "image" | "raw" | "auto" } = {}
) {
  return new Promise<any>((resolve, reject) => {
    const uploadOptions: any = {
      resource_type: options.resource_type || "auto",
      folder: options.folder,
      public_id: filename.replace(/\.[^/.]+$/, ""),
    };
    const uploadStream = cloudinary.v2.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export function generateSignature(paramsToSign: Record<string, any> = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { ...paramsToSign, timestamp };
  const signature = cloudinary.v2.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET || "");
  return {
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  };
}