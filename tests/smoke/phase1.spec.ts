import { describe, expect, it } from "vitest";

describe("phase 1 monorepo initialization", () => {
  it("exposes a stable lab identity", () => {
    const lab = {
      name: "doctrine-lab-supply-chain-model",
      phase: 1,
      mode: "clean-room"
    } as const;

    expect(lab.name).toBe("doctrine-lab-supply-chain-model");
    expect(lab.phase).toBe(1);
    expect(lab.mode).toBe("clean-room");
  });
});
