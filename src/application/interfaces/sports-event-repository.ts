import { Token } from "typedi";

import type { EventId, SportId, SportsEvent, TeamId } from "../../domain/index.js";

export type ScheduleCommand = {
  id: EventId;
  sportId: SportId;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  scheduledAt: Date;
  durationMs: number;
};

export type RescheduleCommand = {
  id: EventId;
  scheduledAt: Date;
  durationMs: number;
};

export interface SportsEventRepository {
  findById(id: EventId): Promise<SportsEvent | null>;
  findByIdOrFail(id: EventId): Promise<SportsEvent>;
  save(event: SportsEvent): Promise<SportsEvent>;
  schedule(command: ScheduleCommand): Promise<SportsEvent>;
  reschedule(command: RescheduleCommand): Promise<SportsEvent>;
}

export const SportsEventRepositoryToken = new Token<SportsEventRepository>("SportsEventRepository");
