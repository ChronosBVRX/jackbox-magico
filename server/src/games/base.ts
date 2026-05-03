import { Server } from "socket.io";
import { RoomEngine } from "../engine/roomEngine";

export interface GameModule {
  id: string;
  roomCode: string;
  io: Server;
  engine: RoomEngine;

  start(): void;
  handleEvent(event: string, payload: any, clientId: string): void;
  cleanup(): void;
}
