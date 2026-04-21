import { describe, expect, it } from "vitest";
import { healthHandler, predictionsSummaryHandler } from "./app.js";

function createMockResponse() {
  return {
    body: undefined,
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("API app", () => {
  it("returns API health status", () => {
    const response = createMockResponse();

    healthHandler({}, response);

    expect(response.body).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("returns the predictions summary placeholder payload", () => {
    const response = createMockResponse();

    predictionsSummaryHandler({}, response);

    expect(response.body).toEqual({
      trend: "neutral",
      confidence: 0.0,
      message: "Prediction summary endpoint placeholder",
    });
  });
});
