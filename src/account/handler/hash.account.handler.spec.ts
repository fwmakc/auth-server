import { hash, compare } from "@node-rs/bcrypt";

/**
 * Mechanism pin for the load-test finding (Wave 6 / Stage 4): login storms
 * under bcryptjs (pure JS) blocked the event loop for the whole hash and,
 * combined with high query concurrency, starved pooled pg connections —
 * TypeORM runners got released mid-request and logins answered 500
 * (QueryRunnerAlreadyReleasedError, 2–3.4% of a cost-12 storm).
 *
 * The native implementation runs on the libuv threadpool: the event loop
 * must stay responsive while hashes are computed. Under the old library
 * 4 concurrent cost-10 hashes ≈ 220 ms of uninterrupted blocking and this
 * test fails on the lag assertion.
 */
describe("native bcrypt (event-loop non-blocking)", () => {
  it("hashes run off the event loop — the loop stays responsive during parallel hashing", async () => {
    let maxLag = 0;
    let last = Date.now();
    const sampler = setInterval(() => {
      const now = Date.now();
      maxLag = Math.max(maxLag, now - last);
      last = now;
    }, 5);

    const hashes = await Promise.all(
      Array.from({ length: 4 }, () => hash("LoadPass123!", 10)),
    );
    clearInterval(sampler);

    expect(hashes).toHaveLength(4);
    // a pure-JS implementation would not let the 5 ms sampler fire for the
    // whole serial hashing time (~4 × 55 ms); the threadpool keeps the gap
    // far below that
    expect(maxLag).toBeLessThan(100);

    expect(await compare("LoadPass123!", hashes[0])).toBe(true);
    expect(await compare("nope", hashes[0])).toBe(false);
  });

  it("verifies legacy bcryptjs $2a$ hashes (pre-migration accounts)", async () => {
    // the seed-load.sql cost-10 hash from the bcryptjs era
    const legacy =
      "$2a$10$5cMkpXG4.QZXf6mmQ9GzguHwswbTHgG/PPADA5RuabDyrYJib10Py";
    expect(await compare("LoadPass123!", legacy)).toBe(true);
    expect(await compare("wrong", legacy)).toBe(false);
  });
});
