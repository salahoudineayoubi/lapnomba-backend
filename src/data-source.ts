import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "lapnomba",
  synchronize: true, // à mettre false en production
  logging: false,
  entities: [
    __dirname + "/models/*.ts"
  ],
  migrations: [],
  subscribers: [],
});