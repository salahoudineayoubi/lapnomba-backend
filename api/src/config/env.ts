import "dotenv/config";
import { cleanEnv, num, str } from "envalid";
export const envConfig = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  NODE_ENV: str({ default: "development", choices: ["development", "production", "test"] }),
  DB_PROTOCOL: str({ choices: ["postgres", "sqlite"] }),
  DB_HOST: str(),
  DB_PORT: num(),
  DB_NAME: str(),
  DB_USER: str(),
  DB_PASSWORD: str(),
  SALT_ROUNDS: num(),
  JWT_SECRET_FILE_PATH: str({ default: "" }),
  JWT_EXPIRATION: str({ default: "1d" }),
  JWT_ISSUER: str({ default: "" }),
  JWT_AUDIENCE: str({ default: "" }),
  JWT_ALGORITHM: str({
    default: "RS256",
    choices: [
      "RS256",
      "RS384",
      "RS512",
      "RSA-OAEP",
      "RSA-OAEP-256",
      "RSA-OAEP-384",
      "RSA-OAEP-512",
    ],
  }),
});
export type EnvConfig = typeof envConfig;