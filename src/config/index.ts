import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  db: {
    uri: process.env.DB_URI || 'mongodb://localhost:27017/marketplace',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  environment: process.env.NODE_ENV || 'development',
};

export default config;