import { EventStatusName } from "../../domain/event-status/index.js";
import { EntitySchema } from "typeorm";

import type { SportsEventSearchResult } from "../../application/interfaces/sports-event-search-repository.js";

export type SportsEventRow = SportsEventSearchResult;

export const SportsEventSchema = new EntitySchema<SportsEventRow>({
  name: "SportsEvent",
  tableName: "sports_events",
  columns: {
    id: {
      type: "uuid",
      name: "id",
      primary: true,
    },
    sportId: {
      type: "smallint",
      name: "sport_id",
    },
    homeTeamId: {
      type: "uuid",
      name: "home_team_id",
    },
    awayTeamId: {
      type: "uuid",
      name: "away_team_id",
    },
    scheduledAt: {
      type: "timestamptz",
      name: "scheduled_at",
    },
    status: {
      type: "enum",
      enum: Object.values(EventStatusName),
      enumName: "sports_event_status",
      name: "status",
    },
    startedAt: {
      type: "timestamptz",
      name: "started_at",
      nullable: true,
    },
    finishedAt: {
      type: "timestamptz",
      name: "finished_at",
      nullable: true,
    },
    cancelledAt: {
      type: "timestamptz",
      name: "cancelled_at",
      nullable: true,
    },
    cancellationReason: {
      type: "varchar",
      length: 500,
      name: "cancellation_reason",
      nullable: true,
    },
    version: {
      type: "integer",
      name: "version",
    },
  },
  indices: [
    {
      name: "idx_sports_events_home_team_status_date",
      columns: ["homeTeamId", "status", "scheduledAt"],
    },
    {
      name: "idx_sports_events_away_team_status_date",
      columns: ["awayTeamId", "status", "scheduledAt"],
    },
    {
      name: "idx_sports_events_sport_status_date",
      columns: ["sportId", "status", "scheduledAt"],
    },
  ],
  checks: [
    {
      name: "chk_sports_events_different_teams",
      expression: `"home_team_id" <> "away_team_id"`,
    },
    {
      name: "chk_sports_events_version",
      expression: `"version" >= 1`,
    },
  ],
  foreignKeys: [
    {
      target: "Sport",
      columnNames: ["sportId"],
      referencedColumnNames: ["id"],
    },
    {
      target: "Team",
      columnNames: ["homeTeamId", "sportId"],
      referencedColumnNames: ["id", "sportId"],
    },
    {
      target: "Team",
      columnNames: ["awayTeamId", "sportId"],
      referencedColumnNames: ["id", "sportId"],
    },
  ],
});
