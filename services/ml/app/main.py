from fastapi import FastAPI


app = FastAPI(title="Astraq ML Service")


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
