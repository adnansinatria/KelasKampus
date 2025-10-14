import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSignup, handleSignin, handleGoogle, handleMe } from "./routes/auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth placeholder routes using Supabase anon key (for dev/testing only)
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/signin", handleSignin);
  app.get("/api/auth/google", handleGoogle);
  app.get("/api/auth/me", handleMe);

  return app;
}
