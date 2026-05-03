import { Server } from "socket.io";
import { GameModule } from "./base";
import { RoomEngine } from "../engine/roomEngine";
import { triviaQuestions, TriviaQuestion } from "../data/triviaQuestions";
import { calculateTriviaPoints } from "../engine/scoring";

export class TriviaMagica implements GameModule {
  id = "trivia_magica";
  roomCode: string;
  io: Server;
  engine: RoomEngine;

  private currentQuestion: TriviaQuestion | null = null;
  private roundNumber = 0;
  private totalRounds = 10;
  private answeredClients: Set<string> = new Set();
  private roundAnswers: Array<{ clientId: string; answer: string; elapsedMs: number }> = [];
  private timer: NodeJS.Timeout | null = null;
  private startedAt = 0;
  private durationMs = 20000;

  constructor(roomCode: string, io: Server, engine: RoomEngine) {
    this.roomCode = roomCode;
    this.io = io;
    this.engine = engine;
  }

  start() {
    this.nextRound();
  }

  private nextRound() {
    this.roundNumber++;
    if (this.roundNumber > this.totalRounds) {
      this.finishGame();
      return;
    }

    this.answeredClients.clear();
    this.roundAnswers = [];
    
    // Pick a random question (could be optimized to avoid repeats)
    this.currentQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    this.startedAt = Date.now();

    // Broadcast question to everyone
    // IMPORTANT: Don't send correctAnswer to mobile
    const questionPayload = {
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      category: this.currentQuestion.category,
      difficulty: this.currentQuestion.difficulty,
      question: this.currentQuestion.question,
      options: this.currentQuestion.options,
      durationMs: this.durationMs,
      startedAt: this.startedAt
    };

    this.io.to(this.roomCode).emit("trivia_question", questionPayload);

    // Set timeout to close round
    this.timer = setTimeout(() => this.resolveRound(), this.durationMs + 1000);
  }

  handleEvent(event: string, payload: any, clientId: string) {
    if (event === "answer_submit") {
      this.handleAnswer(clientId, payload.answer);
    } else if (event === "tv_next_round" && clientId === "HOST") {
      this.nextRound();
    } else if (event === "tv_back_to_lobby" && clientId === "HOST") {
      this.cleanup();
      this.engine.setRoomStatus(this.roomCode, "lobby");
      this.io.to(this.roomCode).emit("room_state", this.engine.getRoom(this.roomCode));
    }
  }

  private handleAnswer(clientId: string, answer: string) {
    if (this.answeredClients.has(clientId)) return;
    if (!this.currentQuestion) return;

    this.answeredClients.add(clientId);
    const elapsedMs = Date.now() - this.startedAt;
    
    this.roundAnswers.push({ clientId, answer, elapsedMs });

    // Send ACK to player
    this.io.to(clientId).emit("answer_ack", { success: true });

    // Notify TV of answer count
    this.io.to(this.roomCode).emit("answer_count", {
      count: this.answeredClients.size,
      total: this.engine.getRoom(this.roomCode)?.players.length || 0
    });

    // If everyone answered, resolve early
    const totalPlayers = this.engine.getRoom(this.roomCode)?.players.length || 0;
    if (this.answeredClients.size >= totalPlayers) {
      if (this.timer) clearTimeout(this.timer);
      this.resolveRound();
    }
  }

  private resolveRound() {
    if (!this.currentQuestion) return;

    const results: any[] = [];
    const housePoints: Record<string, number> = {};
    
    // Find fastest correct answer
    let fastestClientId: string | null = null;
    let minElapsed = Infinity;

    this.roundAnswers.forEach(ans => {
      if (ans.answer === this.currentQuestion?.correctAnswer && ans.elapsedMs < minElapsed) {
        minElapsed = ans.elapsedMs;
        fastestClientId = ans.clientId;
      }
    });

    const room = this.engine.getRoom(this.roomCode);
    if (!room) return;

    room.players.forEach(player => {
      const playerAnswer = this.roundAnswers.find(a => a.clientId === player.clientId);
      const isCorrect = playerAnswer?.answer === this.currentQuestion?.correctAnswer;
      const isFastest = player.clientId === fastestClientId;

      // Calculate points
      const { points, labels } = calculateTriviaPoints(
        this.currentQuestion!.difficulty,
        isCorrect,
        isFastest,
        player.streak || 0
      );

      // Update player state in engine
      player.points += points;
      if (isCorrect) {
        player.streak = (player.streak || 0) + 1;
      } else {
        player.streak = 0;
      }

      results.push({
        clientId: player.clientId,
        name: player.name,
        house: player.house,
        answer: playerAnswer?.answer || null,
        isCorrect,
        points,
        labels
      });

      // Accumulate house points
      housePoints[player.house] = (housePoints[player.house] || 0) + points;
    });

    // Broadcast results
    this.io.to(this.roomCode).emit("round_results", {
      correctAnswer: this.currentQuestion.correctAnswer,
      narratorComment: this.currentQuestion.narratorComment,
      results
    });

    // Update scoreboard
    this.io.to(this.roomCode).emit("scoreboard_state", {
      players: room.players.map(p => ({ name: p.name, points: p.points, house: p.house })),
      houses: housePoints
    });
  }

  private finishGame() {
    this.io.to(this.roomCode).emit("game_finished", {
      winner: "Todo el mundo mágico" // Placeholder
    });
    // Return to lobby after a delay or wait for host
  }

  cleanup() {
    if (this.timer) clearTimeout(this.timer);
  }
}
