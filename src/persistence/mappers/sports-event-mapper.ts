import "reflect-metadata";
import {
  eventId,
  EventStatus,
  EventStatusName,
  sportId,
  SportsEvent,
} from "../../domain/index.js";
import { TeamMapper } from "./team-mapper.js";
import { Inject, Service } from "typedi";

import type { EventState } from "../../domain/index.js";
import type { SportsEventRow } from "../schemas/sports-event.js";
import type { TeamRow } from "../schemas/team.js";
import type { Mapper } from "./mapper.js";

export type SportsEventRecord = Omit<SportsEventRow, NullableEventColumn> &
  Partial<Pick<SportsEventRow, NullableEventColumn>> & {
    homeTeam: TeamRow;
    awayTeam: TeamRow;
  };

type NullableEventColumn =
  | "startedAt"
  | "finishedAt"
  | "cancelledAt"
  | "cancellationReason";

@Service()
export class SportsEventMapper implements Mapper<SportsEvent, SportsEventRecord> {
  @Inject(() => TeamMapper)
  private readonly teamMapper!: TeamMapper;

  public toDomain(record: SportsEventRecord): SportsEvent {
    return SportsEvent.reconstitute({
      id: eventId(record.id),
      sportId: sportId(record.sportId),
      homeTeam: this.teamMapper.toDomain(record.homeTeam),
      awayTeam: this.teamMapper.toDomain(record.awayTeam),
      scheduledAt: record.scheduledAt,
      version: record.version,
      status: EventStatus.create({
        status: record.status,
        startedAt: record.startedAt ?? null,
        finishedAt: record.finishedAt ?? null,
        cancelledAt: record.cancelledAt ?? null,
        cancelationReason: record.cancellationReason ?? null,
      }),
    });
  }

  public toPersistence(event: SportsEvent): SportsEventRecord {
    const homeTeam = this.teamMapper.toPersistence(event.homeTeam);
    const awayTeam = this.teamMapper.toPersistence(event.awayTeam);

    return {
      id: event.id,
      sportId: event.sportId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeTeam,
      awayTeam,
      scheduledAt: event.scheduledAt,
      version: event.version,
      ...statusColumns(event.status.state),
    };
  }
}

function statusColumns(
  state: EventState,
): Pick<SportsEventRow, "status"> & Partial<Pick<SportsEventRow, NullableEventColumn>> {
  switch (state.status) {
    case EventStatusName.Scheduled:
      return { status: state.status };
    case EventStatusName.InProgress:
      return {
        status: state.status,
        startedAt: state.startedAt,
      };
    case EventStatusName.Finished:
      return {
        status: state.status,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
      };
    case EventStatusName.Cancelled:
      return {
        status: state.status,
        cancelledAt: state.cancelledAt,
        cancellationReason: state.cancelationReason,
      };
  }
}
