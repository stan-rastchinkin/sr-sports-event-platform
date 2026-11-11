import { DomainError } from "../../../../src/domain/core/index.js";
import {
  EventStatus,
  SportsEventStatusDomainError,
} from "../../../../src/domain/event-status/index.js";
import { describe, expect, it } from "@jest/globals";

function expectStatusError(act: () => void, message: string): void {
  expect(act).toThrow(SportsEventStatusDomainError);
  expect(act).toThrow(message);
}

const startedAt = new Date("2026-06-01T15:00:00.000Z");
const finishedAt = new Date("2026-06-01T17:00:00.000Z");
const cancelledAt = new Date("2026-05-31T12:00:00.000Z");

function scheduledStatus(): EventStatus {
  return EventStatus.create({ kind: "scheduled" });
}

describe("SportsEventStatusDomainError", () => {
  it("extends DomainError and uses the class name", () => {
    const error = new SportsEventStatusDomainError("Only scheduled events can start");

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe("SportsEventStatusDomainError");
  });
});

describe("EventStatus", () => {
  it("creates a scheduled status with no lifecycle timestamps", () => {
    expect(scheduledStatus().state).toEqual({
      kind: "scheduled",
    });
  });

  it("starts only a scheduled status and leaves the original unchanged", () => {
    const scheduled = scheduledStatus();
    const started = scheduled.start(startedAt);

    expect(scheduled.state.kind).toBe("scheduled");
    expect(started).not.toBe(scheduled);
    expect(started.state).toEqual({
      kind: "in_progress",
      startedAt,
    });
  });

  it("finishes an in-progress status when completion does not precede the start", () => {
    const started = scheduledStatus().start(startedAt);

    expect(started.finish(finishedAt).state).toEqual({
      kind: "finished",
      startedAt,
      finishedAt,
    });
    expect(started.finish(startedAt).state.kind).toBe("finished");
  });

  it("cancels a scheduled status and stores the trimmed reason", () => {
    const cancelled = scheduledStatus().cancel("  heavy rain  ", cancelledAt);

    expect(cancelled.state).toEqual({
      kind: "cancelled",
      cancelledAt,
      reason: "heavy rain",
    });
  });

  it("rejects a finish timestamp that precedes the start", () => {
    const started = scheduledStatus().start(finishedAt);

    expectStatusError(
      () => started.finish(startedAt),
      "Finish timestamp must not precede the start timestamp",
    );
    expect(started.state.kind).toBe("in_progress");
  });

  it.each(["", "   "])("rejects a blank cancellation reason %j", (reason) => {
    const scheduled = scheduledStatus();

    expectStatusError(
      () => scheduled.cancel(reason, cancelledAt),
      "Cancellation reason must be nonempty",
    );
    expect(scheduled.state.kind).toBe("scheduled");
  });

  it("rejects invalid timestamps without changing the current status", () => {
    const scheduled = scheduledStatus();

    expect(() => scheduled.start(new Date(Number.NaN))).toThrow(
      "expected date, received Date",
    );
    expect(scheduled.state.kind).toBe("scheduled");
  });

  it.each([
    ["start", (status: EventStatus) => status.start(startedAt)],
    ["finish", (status: EventStatus) => status.finish(finishedAt)],
    ["cancel", (status: EventStatus) => status.cancel("rain", cancelledAt)],
  ] as const)("rejects %s from a finished status", (_name, transition) => {
    const finished = scheduledStatus().start(startedAt).finish(finishedAt);

    expect(() => transition(finished)).toThrow(SportsEventStatusDomainError);
    expect(finished.state.kind).toBe("finished");
  });

  it("rejects start and cancel once an event is in progress, and finish once it is cancelled", () => {
    const started = scheduledStatus().start(startedAt);
    const cancelled = scheduledStatus().cancel("rain", cancelledAt);

    expectStatusError(
      () => scheduledStatus().finish(finishedAt),
      "Only in-progress events can finish",
    );
    expectStatusError(
      () => started.start(startedAt),
      "Only scheduled events can start",
    );
    expectStatusError(
      () => started.cancel("rain", cancelledAt),
      "Only scheduled events can be cancelled",
    );
    expectStatusError(
      () => cancelled.finish(finishedAt),
      "Only in-progress events can finish",
    );
    expectStatusError(
      () => cancelled.start(startedAt),
      "Only scheduled events can start",
    );
  });

  it("does not expose a date the caller can mutate", () => {
    const input = new Date(startedAt.getTime());
    const started = scheduledStatus().start(input);
    input.setUTCFullYear(1999);

    const exposed = started.state;
    if (exposed.kind !== "in_progress") {
      throw new Error("expected in_progress");
    }
    exposed.startedAt.setUTCFullYear(1999);

    const reread = started.state;
    if (reread.kind !== "in_progress") {
      throw new Error("expected in_progress");
    }
    expect(reread.startedAt.toISOString()).toBe("2026-06-01T15:00:00.000Z");
    expect(reread.startedAt).not.toBe(input);
  });

  it("creates each valid lifecycle record", () => {
    expect(EventStatus.create({ kind: "scheduled" }).state.kind).toBe("scheduled");

    expect(EventStatus.create({ kind: "in_progress", startedAt }).state.kind).toBe(
      "in_progress",
    );

    expect(
      EventStatus.create({
        kind: "finished",
        startedAt,
        finishedAt,
      }).state,
    ).toEqual({
      kind: "finished",
      startedAt,
      finishedAt,
    });

    expect(
      EventStatus.create({
        kind: "cancelled",
        cancelledAt,
        reason: "  rain  ",
      }).state.reason,
    ).toBe("rain");
  });

  it("rejects combinations that disagree with the status", () => {
    expectStatusError(
      () =>
        EventStatus.create({
          kind: "scheduled",
          startedAt,
        }),
      "startedAt: must be undefined",
    );

    expectStatusError(
      () => EventStatus.create({ kind: "in_progress" }),
      "startedAt: Invalid input: expected date, received undefined",
    );

    expectStatusError(
      () =>
        EventStatus.create({
          kind: "finished",
          startedAt: finishedAt,
          finishedAt: startedAt,
        }),
      "Finish timestamp must not precede the start timestamp",
    );

    expectStatusError(
      () =>
        EventStatus.create({
          kind: "cancelled",
          cancelledAt,
          reason: "   ",
        }),
      "Cancellation reason must be nonempty",
    );

    expectStatusError(
      () => EventStatus.create({ kind: "postponed" }),
      'Unknown event status; extras: {"status":"postponed"}',
    );
  });
});
