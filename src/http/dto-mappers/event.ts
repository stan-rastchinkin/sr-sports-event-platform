import { EventStatusName } from "../../domain/index.js";
import { teamDtoSchema, toTeamDto } from "./team.js";
import { z } from "zod";

import type { SportsEventSearchResult } from "../../application/interfaces/sports-event-search-repository.js";
import type { EventState, SportsEvent } from "../../domain/index.js";

const eventStatusDtoSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal(EventStatusName.Scheduled),
  }),
  z.object({
    status: z.literal(EventStatusName.InProgress),
    startedAt: z.iso.datetime(),
  }),
  z.object({
    status: z.literal(EventStatusName.Finished),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime(),
  }),
  z.object({
    status: z.literal(EventStatusName.Cancelled),
    cancelledAt: z.iso.datetime(),
    cancellationReason: z.string(),
  }),
]);

const eventShape = z.object({
  id: z.uuid(),
  sportId: z.int(),
  homeTeam: teamDtoSchema,
  awayTeam: teamDtoSchema,
  scheduledAt: z.iso.datetime(),
  status: eventStatusDtoSchema,
});

const homeTeam = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  sportId: 1,
  name: "Salzburg",
} satisfies z.input<typeof teamDtoSchema>;

const awayTeam = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  sportId: 1,
  name: "Sturm",
} satisfies z.input<typeof teamDtoSchema>;

const scheduledEvent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  sportId: 1,
  homeTeam,
  awayTeam,
  scheduledAt: "2027-01-15T18:30:00Z",
  status: {
    status: EventStatusName.Scheduled,
  },
} satisfies z.input<typeof eventShape>;

const inProgressEvent = {
  ...scheduledEvent,
  status: {
    status: EventStatusName.InProgress,
    startedAt: "2027-01-15T18:32:00Z",
  },
} satisfies z.input<typeof eventShape>;

const finishedEvent = {
  ...scheduledEvent,
  status: {
    status: EventStatusName.Finished,
    startedAt: "2027-01-15T18:32:00Z",
    finishedAt: "2027-01-15T20:15:00Z",
  },
} satisfies z.input<typeof eventShape>;

const cancelledEvent = {
  ...scheduledEvent,
  status: {
    status: EventStatusName.Cancelled,
    cancelledAt: "2027-01-14T09:00:00Z",
    cancellationReason: "Pitch unplayable",
  },
} satisfies z.input<typeof eventShape>;

export const eventDtoSchema = eventShape.meta({
  examples: [scheduledEvent, inProgressEvent, finishedEvent, cancelledEvent],
});

const searchResultShape = z.object({
  id: z.uuid(),
  sportId: z.int(),
  homeTeamId: z.uuid(),
  awayTeamId: z.uuid(),
  scheduledAt: z.iso.datetime(),
  status: z.enum(["scheduled", "in_progress", "finished", "cancelled"]),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancellationReason: z.string().nullable(),
});

const scheduledSearchResult = {
  id: scheduledEvent.id,
  sportId: scheduledEvent.sportId,
  homeTeamId: homeTeam.id,
  awayTeamId: awayTeam.id,
  scheduledAt: scheduledEvent.scheduledAt,
  status: "scheduled",
  startedAt: null,
  finishedAt: null,
  cancelledAt: null,
  cancellationReason: null,
} satisfies z.input<typeof searchResultShape>;

const inProgressSearchResult = {
  ...scheduledSearchResult,
  status: "in_progress",
  startedAt: "2027-01-15T18:32:00Z",
} satisfies z.input<typeof searchResultShape>;

export const eventSearchResultDtoSchema = searchResultShape.meta({
  examples: [scheduledSearchResult, inProgressSearchResult],
});

export const eventSearchResultListDtoSchema = z.array(eventSearchResultDtoSchema).meta({
  examples: [[scheduledSearchResult, inProgressSearchResult]],
});

export type EventDto = z.output<typeof eventDtoSchema>;
export type EventSearchResultDto = z.output<typeof eventSearchResultDtoSchema>;

export function toEventDto(event: SportsEvent): EventDto {
  return {
    id: event.id,
    sportId: event.sportId,
    homeTeam: toTeamDto(event.homeTeam),
    awayTeam: toTeamDto(event.awayTeam),
    scheduledAt: event.scheduledAt.toISOString(),
    status: toStatusDto(event.status.state),
  };
}

export function toEventSearchResultDto(result: SportsEventSearchResult): EventSearchResultDto {
  return {
    id: result.id,
    sportId: result.sportId,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    scheduledAt: result.scheduledAt.toISOString(),
    status: result.status,
    startedAt: isoOrNull(result.startedAt),
    finishedAt: isoOrNull(result.finishedAt),
    cancelledAt: isoOrNull(result.cancelledAt),
    cancellationReason: result.cancellationReason,
  };
}

function toStatusDto(state: EventState): EventDto["status"] {
  switch (state.status) {
    case EventStatusName.Scheduled:
      return { status: state.status };
    case EventStatusName.InProgress:
      return {
        status: state.status,
        startedAt: state.startedAt.toISOString(),
      };
    case EventStatusName.Finished:
      return {
        status: state.status,
        startedAt: state.startedAt.toISOString(),
        finishedAt: state.finishedAt.toISOString(),
      };
    case EventStatusName.Cancelled:
      return {
        status: state.status,
        cancelledAt: state.cancelledAt.toISOString(),
        cancellationReason: state.cancelationReason,
      };
  }
}

function isoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}
