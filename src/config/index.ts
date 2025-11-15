import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  db: {
    uri:
      process.env.MONGO_URI ||
      `mongodb://${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "27017"}/${process.env.DB_NAME || "lapnomba"}`,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    // Les options suivantes sont dépréciées et peuvent être retirées
    // options: {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // },
  },
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
  environment: process.env.NODE_ENV || "development",
};

export default config;