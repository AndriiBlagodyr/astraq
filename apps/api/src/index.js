import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api"
  });
});

app.get("/api/predictions/summary", (_req, res) => {
  res.json({
    trend: "neutral",
    confidence: 0.0,
    message: "Prediction summary endpoint placeholder"
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

