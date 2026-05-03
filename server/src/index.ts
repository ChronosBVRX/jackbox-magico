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

app.use(cors());
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
  console.log(`Jackbox Mágico V2 corriendo en puerto ${PORT}`);
  console.log(`Lobby TV: http://localhost:${PORT}/v2/tv/`);
  console.log(`Lobby Móvil: http://localhost:${PORT}/v2/mobile/`);
  console.log(`=========================================`);
});
