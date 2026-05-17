import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { setupSocketServer } from './socket/socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos de la V2
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Servir catálogos de datos (V1 compatibility)
const dataPath = path.join(process.cwd(), 'data');
app.use('/data', express.static(dataPath));

// Redirecciones automáticas a la V2
app.get('/', (req, res) => res.redirect('/v2/tv/'));
app.get('/tv', (req, res) => res.redirect('/v2/tv/'));
app.get('/tv/', (req, res) => res.redirect('/v2/tv/'));
app.get('/mobile', (req, res) => res.redirect('/v2/mobile/'));
app.get('/mobile/', (req, res) => res.redirect('/v2/mobile/'));

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0-realtime' });
});

setupSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Hogwarts Game Night corriendo en puerto ${PORT}`);
  console.log(`Lobby TV: http://localhost:${PORT}/v2/tv/`);
  console.log(`Lobby Móvil: http://localhost:${PORT}/v2/mobile/`);
  console.log(`=========================================`);
});
