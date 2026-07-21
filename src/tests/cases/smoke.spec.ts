import { createHttpTestApp } from "../app.testingModule";

describe("Smoke test — module compiles", () => {
  it("should create the app", async () => {
    const { app } = await createHttpTestApp();
    expect(app).toBeDefined();
    await app.close();
  });
});
