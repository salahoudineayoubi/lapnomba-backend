import express from 'express';
import cors from 'cors';
import { sequelize } from './config/db'; 
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import dashboardRouter from './routes/dashboard';
import projetsRouter from './routes/projet';

const app = express();

const allowedOrigins = [
  'http://lapnomba.org',
  'https://lapnomba.org',
  'https://admin.lapnomba.org',
  'http://localhost:3000' 
];

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origin (ex: curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
})); 
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/projets', projetsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Gestion globale des erreurs non gérées
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});