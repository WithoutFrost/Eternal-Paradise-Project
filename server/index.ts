import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // --- 🚀 Servir frontend build ---
  const clientPath = path.resolve(__dirname, "../client");
  app.use(express.static(clientPath));

  // Fallback: qualquer rota não-API → index.html do React
  app.get("*", (req, res) => {
    // só cai aqui se não for /api
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(clientPath, "index.html"));
    }
  });

  return app;
}
