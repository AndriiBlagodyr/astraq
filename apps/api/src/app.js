import cors from "cors";
import express from "express";

export function healthHandler(_req, res) {
  res.json({
    status: "ok",
    service: "api",
  });
}

export function predictionsSummaryHandler(_req, res) {
  res.json({
    trend: "neutral",
    confidence: 0.0,
    message: "Prediction summary endpoint placeholder",
  });
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", healthHandler);

  app.get("/api/predictions/summary", predictionsSummaryHandler);

  return app;
}
