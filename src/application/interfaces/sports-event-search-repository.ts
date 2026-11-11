import { Token } from "typedi";

import type { EventKind, SportId, TeamId } from "../../domain/index.js";

export type EventSearchCriteria = {
  sportId?: SportId;
  teamId?: TeamId;
  status?: EventKind;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  limit: number;
  offset: number;
  sort: "ASC" | "DESC";
};

export type SportsEventSearchResult = {
  id: string;
  sportId: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  status: EventKind;
  startedAt: Date | null;
  finishedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  version: number;
};

export interface SportsEventSearchRepository {
  search(criteria: EventSearchCriteria): Promise<SportsEventSearchResult[]>;
}

export const SportsEventSearchRepositoryToken = new Token<SportsEventSearchRepository>(
  "SportsEventSearchRepository",
);
