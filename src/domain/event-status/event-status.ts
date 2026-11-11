import { DomainError, validateAgainstSchema } from "../core/index.js";
import { stateSchemaValidators } from "./validation-schemas.js";

import type { EventKind, EventState } from "./validation-schemas.js";

type EventStatusInput = {
  kind: string;
  startedAt?: Date;
  finishedAt?: Date;
  cancelledAt?: Date;
  reason?: string;
};

export class SportsEventStatusDomainError extends DomainError {}

export class EventStatus {
  private readonly stateValue: EventState;

  private constructor(state: EventState) {
    this.stateValue = copyState(state);
  }

  public get state(): EventState {
    return copyState(this.stateValue);
  }

  public static create(input: EventStatusInput): EventStatus {
    if (!Object.hasOwn(stateSchemaValidators, input.kind)) {
      throw new SportsEventStatusDomainError(`Unknown event status`, { status: input.kind });
    }

    const schema = stateSchemaValidators[input.kind as EventKind];
    return new EventStatus(validateAgainstSchema<EventState>(schema, input, SportsEventStatusDomainError));
  }

  public start(at: Date): EventStatus {
    if (this.stateValue.kind !== "scheduled") {
      throw new SportsEventStatusDomainError("Only scheduled events can start", { status: this.stateValue.kind });
    }
    const data = validateAgainstSchema<EventState>(
      stateSchemaValidators.in_progress,
      {
        kind: "in_progress",
        startedAt: new Date(at),
      },
      SportsEventStatusDomainError
    )
    
    return new EventStatus(data);
  }

  public finish(at: Date): EventStatus {
    if (this.stateValue.kind !== "in_progress") {
      throw new SportsEventStatusDomainError("Only in-progress events can finish", { status: this.stateValue.kind });
    }
    const data = validateAgainstSchema<EventState>(
      stateSchemaValidators.finished,
      {
        kind: "finished",
        startedAt: new Date(this.stateValue.startedAt),
        finishedAt: new Date(at),
      },
      SportsEventStatusDomainError
    )

    return new EventStatus(data);
  }

  public cancel(reason: string, at: Date): EventStatus {
    if (this.stateValue.kind !== "scheduled") {
      throw new SportsEventStatusDomainError("Only scheduled events can be cancelled", { status: this.stateValue.kind });
    }
    const data = validateAgainstSchema<EventState>(
      stateSchemaValidators.cancelled,
      {
        kind: "cancelled",
        cancelledAt: new Date(at),
        reason,
      },
      SportsEventStatusDomainError
    )

    return new EventStatus(data);
  }
}

function copyState(state: EventState): EventState {
  switch (state.kind) {
    case "scheduled":
      return { kind: "scheduled" };
    case "in_progress":
      return {
        kind: "in_progress",
        startedAt: new Date(state.startedAt),
      };
    case "finished":
      return {
        kind: "finished",
        startedAt: new Date(state.startedAt),
        finishedAt: new Date(state.finishedAt),
      };
    case "cancelled":
      return {
        kind: "cancelled",
        cancelledAt: new Date(state.cancelledAt),
        reason: state.reason,
      };
  }
}
