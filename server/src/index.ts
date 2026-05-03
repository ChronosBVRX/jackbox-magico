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
app.use(express.static(path.join(__dirname, '../../public')));

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0-realtime' });
});

// En el futuro podemos montar aquí rutas de la V1 si es necesario para coexistencia
// app.use('/v1', ...);

setupSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Jackbox Mágico V2 corriendo en puerto ${PORT}`);
  console.log(`Lobby TV: http://localhost:${PORT}/v2/tv/`);
  console.log(`Lobby Móvil: http://localhost:${PORT}/v2/mobile/`);
  console.log(`=========================================`);
});
