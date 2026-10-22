import { describe, expect, it } from "vitest";
import { isRequestMode, isUpcomingEvent, rewardRequired, spotsLeft, timeSlotOf } from "./campus";

describe("rewardRequired", () => {
  it("requires a reward on Campus Help tasks", () => expect(rewardRequired("Hustle")).toBe(true));
  it("does not require a reward on sports posts", () => expect(rewardRequired("Playground")).toBe(false));
  it("does not require a reward on hangout plans", () => expect(rewardRequired("Lounge")).toBe(false));
  it("requires a reward on paid gigs", () => expect(rewardRequired("Gigs", "paid")).toBe(true));
  it("requires what you offer back on skill exchanges", () => expect(rewardRequired("Gigs", "exchange")).toBe(true));
  it("does not require a reward on unpaid help", () => expect(rewardRequired("Gigs", "unpaid")).toBe(false));
});

describe("isRequestMode", () => {
  it("keeps the Campus Help offer-to-help chat", () => expect(isRequestMode("Hustle")).toBe(false));
  it("locks sports chat until accepted", () => expect(isRequestMode("Playground")).toBe(true));
  it("locks hangout chat until accepted", () => expect(isRequestMode("Lounge")).toBe(true));
  it("locks student hustle chat until accepted", () => expect(isRequestMode("Gigs")).toBe(true));
});

describe("spotsLeft", () => {
  it("a partner post (size 2) has 1 spot before anyone is accepted", () => expect(spotsLeft(2, 0)).toBe(1));
  it("a partner post is full after 1 acceptance", () => expect(spotsLeft(2, 1)).toBe(0));
  it("a group of 5 with 2 accepted has 2 spots left", () => expect(spotsLeft(5, 2)).toBe(2));
  it("no group size means no limit", () => expect(spotsLeft(null, 3)).toBeNull());
});

describe("timeSlotOf", () => {
  it("6pm is evening", () => expect(timeSlotOf(new Date(2026, 9, 22, 18, 0).toISOString())).toBe("Evening"));
  it("7am is morning", () => expect(timeSlotOf(new Date(2026, 9, 22, 7, 0).toISOString())).toBe("Morning"));
  it("11pm is night", () => expect(timeSlotOf(new Date(2026, 9, 22, 23, 0).toISOString())).toBe("Night"));
});

describe("isUpcomingEvent", () => {
  it("hides an event that already ended", () =>
    expect(isUpcomingEvent({ starts_at: "2026-10-01T18:00:00Z", ends_at: "2026-10-01T23:00:00Z" })).toBe(false));
  it("shows an event that ends in the future", () =>
    expect(isUpcomingEvent({ starts_at: null, ends_at: new Date(Date.now() + 86_400_000).toISOString() })).toBe(true));
});
