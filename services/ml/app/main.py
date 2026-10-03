from fastapi import FastAPI

from app.settings import settings

app = FastAPI(title="Forelume ML Service", debug=settings.environment == "development")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ml"}


@app.get("/predict")
async def predict() -> dict[str, float | str]:
    return {
        "symbol": "BTCUSDT",
        "prediction": "hold",
        "confidence": 0.0,
    }
