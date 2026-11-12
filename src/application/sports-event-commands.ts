import type { EventId, EventKind, SportId, TeamId } from "../domain/index.js";
import type { PageQuery } from "./page-query.js";

export type ScheduleEventCommand = {
  sportId: SportId;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  scheduledAt: Date;
};

export type RescheduleEventCommand = {
  eventId: EventId;
  scheduledAt: Date;
};

export type StartEventCommand = {
  eventId: EventId;
  at: Date;
};

export type FinishEventCommand = {
  eventId: EventId;
  at: Date;
};

export type CancelEventCommand = {
  eventId: EventId;
  reason: string;
  at: Date;
};

export type SortDirection = "asc" | "desc";

export type SearchEventsQuery = PageQuery & {
  sportId?: SportId;
  teamId?: TeamId;
  status?: EventKind;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  sort?: SortDirection;
};
