import { DomainError, validateAgainstSchema } from "../core/index.js";
import { EventStatusName, stateSchemaValidators } from "./validation-schemas.js";

import type { EventKind, EventState } from "./validation-schemas.js";

type EventStatusInput = {
  status: string;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelationReason?: string | null;
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
    if (!Object.hasOwn(stateSchemaValidators, input.status)) {
      throw new SportsEventStatusDomainError("Unknown event status", { status: input.status });
    }

    const schema = stateSchemaValidators[input.status as EventKind];
    return new EventStatus(validateAgainstSchema(schema, input));
  }

  public start(at: Date): EventStatus {
    if (this.stateValue.status !== EventStatusName.Scheduled) {
      throw new SportsEventStatusDomainError("Only scheduled events can start", {
        status: this.stateValue.status,
      });
    }
    const data = validateAgainstSchema(
      stateSchemaValidators[EventStatusName.InProgress],
      {
        status: EventStatusName.InProgress,
        startedAt: new Date(at),
      },
    );

    return new EventStatus(data);
  }

  public finish(at: Date): EventStatus {
    if (this.stateValue.status !== EventStatusName.InProgress) {
      throw new SportsEventStatusDomainError("Only in-progress events can finish", {
        status: this.stateValue.status,
      });
    }
    const data = validateAgainstSchema(
      stateSchemaValidators[EventStatusName.Finished],
      {
        status: EventStatusName.Finished,
        startedAt: new Date(this.stateValue.startedAt),
        finishedAt: new Date(at),
      },
    );

    return new EventStatus(data);
  }

  public cancel(reason: string, at: Date): EventStatus {
    if (this.stateValue.status !== EventStatusName.Scheduled) {
      throw new SportsEventStatusDomainError("Only scheduled events can be cancelled", {
        status: this.stateValue.status,
      });
    }
    const data = validateAgainstSchema(
      stateSchemaValidators[EventStatusName.Cancelled],
      {
        status: EventStatusName.Cancelled,
        cancelledAt: new Date(at),
        cancelationReason: reason,
      },
    );

    return new EventStatus(data);
  }
}

function copyState(state: EventState): EventState {
  switch (state.status) {
    case EventStatusName.Scheduled:
      return { status: EventStatusName.Scheduled };
    case EventStatusName.InProgress:
      return {
        status: EventStatusName.InProgress,
        startedAt: new Date(state.startedAt),
      };
    case EventStatusName.Finished:
      return {
        status: EventStatusName.Finished,
        startedAt: new Date(state.startedAt),
        finishedAt: new Date(state.finishedAt),
      };
    case EventStatusName.Cancelled:
      return {
        status: EventStatusName.Cancelled,
        cancelledAt: new Date(state.cancelledAt),
        cancelationReason: state.cancelationReason,
      };
  }
}
