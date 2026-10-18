import { describe, expect, it } from "vitest";
import { validateAvatarFile } from "./avatar";

describe("validateAvatarFile", () => {
  it("accepts a 5 MB PNG", () => expect(validateAvatarFile({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull());
  it("rejects files over 5 MB", () => expect(validateAvatarFile({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).not.toBeNull());
  it("rejects GIFs", () => expect(validateAvatarFile({ type: "image/gif", size: 1000 })).not.toBeNull());
  it("rejects SVGs", () => expect(validateAvatarFile({ type: "image/svg+xml", size: 1000 })).not.toBeNull());
});
