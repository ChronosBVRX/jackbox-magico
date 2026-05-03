"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const socketServer_1 = require("./socket/socketServer");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir archivos estáticos de la V2
app.use(express_1.default.static(path_1.default.join(__dirname, '../../public')));
// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0-realtime' });
});
// En el futuro podemos montar aquí rutas de la V1 si es necesario para coexistencia
// app.use('/v1', ...);
(0, socketServer_1.setupSocketServer)(httpServer);
httpServer.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Jackbox Mágico V2 corriendo en puerto ${PORT}`);
    console.log(`Lobby TV: http://localhost:${PORT}/v2/tv/`);
    console.log(`Lobby Móvil: http://localhost:${PORT}/v2/mobile/`);
    console.log(`=========================================`);
});
