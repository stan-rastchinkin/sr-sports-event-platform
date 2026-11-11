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
  return EventStatus.create({ status: "scheduled" });
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
      status: "scheduled",
    });
  });

  it("starts only a scheduled status and leaves the original unchanged", () => {
    const scheduled = scheduledStatus();
    const started = scheduled.start(startedAt);

    expect(scheduled.state.status).toBe("scheduled");
    expect(started).not.toBe(scheduled);
    expect(started.state).toEqual({
      status: "in_progress",
      startedAt,
    });
  });

  it("finishes an in-progress status when completion does not precede the start", () => {
    const started = scheduledStatus().start(startedAt);

    expect(started.finish(finishedAt).state).toEqual({
      status: "finished",
      startedAt,
      finishedAt,
    });
    expect(started.finish(startedAt).state.status).toBe("finished");
  });

  it("cancels a scheduled status and stores the trimmed reason", () => {
    const cancelled = scheduledStatus().cancel("  heavy rain  ", cancelledAt);

    expect(cancelled.state).toEqual({
      status: "cancelled",
      cancelledAt,
      cancelationReason: "heavy rain",
    });
  });

  it("rejects a finish timestamp that precedes the start", () => {
    const started = scheduledStatus().start(finishedAt);

    expectStatusError(
      () => started.finish(startedAt),
      "Finish timestamp must not precede the start timestamp",
    );
    expect(started.state.status).toBe("in_progress");
  });

  it.each(["", "   "])("rejects a blank cancellation reason %j", (reason) => {
    const scheduled = scheduledStatus();

    expectStatusError(
      () => scheduled.cancel(reason, cancelledAt),
      "Cancellation reason must be nonempty",
    );
    expect(scheduled.state.status).toBe("scheduled");
  });

  it("rejects invalid timestamps without changing the current status", () => {
    const scheduled = scheduledStatus();

    expect(() => scheduled.start(new Date(Number.NaN))).toThrow(
      "expected date, received Date",
    );
    expect(scheduled.state.status).toBe("scheduled");
  });

  it.each([
    ["start", (status: EventStatus) => status.start(startedAt)],
    ["finish", (status: EventStatus) => status.finish(finishedAt)],
    ["cancel", (status: EventStatus) => status.cancel("rain", cancelledAt)],
  ] as const)("rejects %s from a finished status", (_name, transition) => {
    const finished = scheduledStatus().start(startedAt).finish(finishedAt);

    expect(() => transition(finished)).toThrow(SportsEventStatusDomainError);
    expect(finished.state.status).toBe("finished");
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
    if (exposed.status !== "in_progress") {
      throw new Error("expected in_progress");
    }
    exposed.startedAt.setUTCFullYear(1999);

    const reread = started.state;
    if (reread.status !== "in_progress") {
      throw new Error("expected in_progress");
    }
    expect(reread.startedAt.toISOString()).toBe("2026-06-01T15:00:00.000Z");
    expect(reread.startedAt).not.toBe(input);
  });

  it("omits null fields that do not belong to the status", () => {
    expect(
      EventStatus.create({
        status: "scheduled",
        startedAt: null,
      }).state,
    ).toEqual({ status: "scheduled" });

    expect(
      EventStatus.create({
        status: "finished",
        startedAt,
        finishedAt,
        cancelledAt: null,
        cancelationReason: null,
      }).state,
    ).toEqual({
      status: "finished",
      startedAt,
      finishedAt,
    });
  });

  it("creates each valid lifecycle record", () => {
    expect(EventStatus.create({ status: "scheduled" }).state.status).toBe("scheduled");

    expect(EventStatus.create({ status: "in_progress", startedAt }).state.status).toBe(
      "in_progress",
    );

    expect(
      EventStatus.create({
        status: "finished",
        startedAt,
        finishedAt,
      }).state,
    ).toEqual({
      status: "finished",
      startedAt,
      finishedAt,
    });

    expect(
      EventStatus.create({
        status: "cancelled",
        cancelledAt,
        cancelationReason: "  rain  ",
      }).state,
    ).toEqual({
      status: "cancelled",
      cancelledAt,
      cancelationReason: "rain",
    });
  });

  it("rejects combinations that disagree with the status", () => {
    expectStatusError(
      () =>
        EventStatus.create({
          status: "scheduled",
          startedAt,
        }),
      'Unrecognized key: "startedAt"',
    );

    expectStatusError(
      () => EventStatus.create({ status: "in_progress" }),
      "startedAt: Invalid input: expected date, received undefined",
    );

    expectStatusError(
      () =>
        EventStatus.create({
          status: "finished",
          startedAt: finishedAt,
          finishedAt: startedAt,
        }),
      "Finish timestamp must not precede the start timestamp",
    );

    expectStatusError(
      () =>
        EventStatus.create({
          status: "cancelled",
          cancelledAt,
          cancelationReason: "   ",
        }),
      "Cancellation reason must be nonempty",
    );

    expectStatusError(
      () => EventStatus.create({ status: "postponed" }),
      'Unknown event status; extras: {"status":"postponed"}',
    );
  });
});
