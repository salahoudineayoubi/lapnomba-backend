import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/db';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import dashboardRouter from './routes/dashboard';
import projetsRouter from './routes/projet';

const app = express();

// CORS
const allowedOrigins = [
  'http://lapnomba.org',
  'https://lapnomba.org',
  'https://admin.lapnomba.org',
  'http://localhost:3000',
  'http://localhost:3001'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/projets', projetsRouter);

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Initialisation DB puis lancement du serveur
initDatabase().then(() => {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
});

// Gestion des erreurs globales
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
