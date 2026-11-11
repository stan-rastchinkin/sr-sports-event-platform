import "reflect-metadata";
import { TeamScheduleConflictError } from "../../application/errors.js";
import { EventStatusName, SportsEvent } from "../../domain/index.js";
import { SportsEventMapper } from "../mappers/sports-event-mapper.js";
import { TeamMapper } from "../mappers/team-mapper.js";
import { SportsEventSchema } from "../schemas/sports-event.js";
import { TeamSchema } from "../schemas/team.js";
import { OptimisticLockError, SportsEventNotFoundError, TeamNotFoundError } from "./errors.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type {
  RescheduleCommand,
  ScheduleCommand,
  SportsEventRepository as SportsEventRepositoryPort,
} from "../../application/interfaces/sports-event-repository.js";
import type { EventId, Team, TeamId } from "../../domain/index.js";
import type { SportsEventRecord } from "../mappers/sports-event-mapper.js";
import type { SportsEventRow } from "../schemas/sports-event.js";
import type { TeamRow } from "../schemas/team.js";
import type { EntityManager } from "typeorm";

type JoinedSportsEventRow = SportsEventRow & {
  homeTeam: TeamRow;
  awayTeam: TeamRow;
};

type EventColumns = Omit<SportsEventRecord, "homeTeam" | "awayTeam">;

type OverlapQuery = {
  teamIds: readonly TeamId[];
  startsAt: Date;
  durationMs: number;
  excludeEventId?: EventId;
};

@Service()
export class SportsEventRepository implements SportsEventRepositoryPort {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  @Inject(() => SportsEventMapper)
  private readonly eventsMapper!: SportsEventMapper;

  @Inject(() => TeamMapper)
  private readonly teamsMapper!: TeamMapper;

  public findById(id: EventId): Promise<SportsEvent | null> {
    return this.findEventById(this.dataSource.manager, id);
  }

  public findByIdOrFail(id: EventId): Promise<SportsEvent> {
    return this.findEventByIdOrFail(this.dataSource.manager, id);
  }

  /**
   * Saves the SportsEvent. **Currently does not save Teams as part of Aggregate**
   */
  public save(event: SportsEvent): Promise<SportsEvent> {
    return this.saveEvent(this.dataSource.manager, event);
  }

  public schedule(command: ScheduleCommand): Promise<SportsEvent> {
    return this.transaction(async (manager) => {
      const teams = await this.lockTeams(manager, [command.homeTeamId, command.awayTeamId]);
      await this.rejectOverlap(manager, {
        teamIds: [command.homeTeamId, command.awayTeamId],
        startsAt: command.scheduledAt,
        durationMs: command.durationMs,
      });
      return this.saveEvent(
        manager,
        SportsEvent.create({
          id: command.id,
          sportId: command.sportId,
          homeTeam: this.teamById(teams, command.homeTeamId),
          awayTeam: this.teamById(teams, command.awayTeamId),
          scheduledAt: command.scheduledAt,
        }),
      );
    });
  }

  public reschedule(command: RescheduleCommand): Promise<SportsEvent> {
    return this.transaction(async (manager) => {
      const event = await this.findEventByIdOrFail(manager, command.id);

      const teamIds = [event.homeTeam.id, event.awayTeam.id];
      await this.lockTeams(manager, teamIds);
      event.reschedule(command.scheduledAt);
      await this.rejectOverlap(manager, {
        teamIds,
        startsAt: command.scheduledAt,
        durationMs: command.durationMs,
        excludeEventId: event.id,
      });
      return this.saveEvent(manager, event);
    });
  }

  private transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction("READ COMMITTED", (manager) => work(manager));
  }

  private joinedEvents(manager: EntityManager) {
    const teamEntityName = this.entityName(TeamSchema);
    return manager
      .getRepository(SportsEventSchema)
      .createQueryBuilder("event")
      .innerJoinAndMapOne(
        "event.homeTeam",
        teamEntityName,
        "homeTeam",
        "homeTeam.id = event.homeTeamId AND homeTeam.sportId = event.sportId",
      )
      .innerJoinAndMapOne(
        "event.awayTeam",
        teamEntityName,
        "awayTeam",
        "awayTeam.id = event.awayTeamId AND awayTeam.sportId = event.sportId",
      );
  }

  private async findEventById(
    manager: EntityManager,
    id: EventId,
  ): Promise<SportsEvent | null> {
    const row = (await this.joinedEvents(manager).where("event.id = :id", { id }).getOne()) as
      | JoinedSportsEventRow
      | null;

    if (row === null) {
      return null;
    }

    return this.eventsMapper.toDomain(row);
  }

  private async findEventByIdOrFail(manager: EntityManager, id: EventId): Promise<SportsEvent> {
    const event = await this.findEventById(manager, id);
    if (event === null) {
      throw new SportsEventNotFoundError(id);
    }

    return event;
  }

  private async lockTeams(manager: EntityManager, ids: readonly TeamId[]): Promise<Team[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await manager
      .getRepository(TeamSchema)
      .createQueryBuilder("team")
      .setLock("pessimistic_write")
      .where("team.id IN (:...ids)", { ids: uniqueIds })
      .orderBy("team.id", "ASC")
      .getMany();

    const found = new Set(rows.map((row) => row.id));
    for (const id of uniqueIds) {
      if (!found.has(id)) {
        throw new TeamNotFoundError(id);
      }
    }

    return rows.map((row) => this.teamsMapper.toDomain(row));
  }

  private async findOverlap(manager: EntityManager, query: OverlapQuery): Promise<boolean> {
    const teamIds = [...new Set(query.teamIds)];
    if (teamIds.length === 0) {
      return false;
    }

    const after = new Date(query.startsAt.getTime() - query.durationMs);
    const before = new Date(query.startsAt.getTime() + query.durationMs);
    const selection = manager
      .getRepository(SportsEventSchema)
      .createQueryBuilder("event")
      .select("event.id")
      .where("event.status <> :cancelled", { cancelled: EventStatusName.Cancelled })
      .andWhere("event.scheduledAt > :after", { after })
      .andWhere("event.scheduledAt < :before", { before })
      .andWhere(
        "(event.homeTeamId IN (:...teamIds) OR event.awayTeamId IN (:...teamIds))",
        { teamIds },
      );

    if (query.excludeEventId !== undefined) {
      selection.andWhere("event.id <> :excludeEventId", {
        excludeEventId: query.excludeEventId,
      });
    }

    const row = await selection.limit(1).getOne();
    return row !== null;
  }

  private async rejectOverlap(manager: EntityManager, query: OverlapQuery): Promise<void> {
    if (await this.findOverlap(manager, query)) {
      throw new TeamScheduleConflictError();
    }
  }

  private teamById(teams: readonly Team[], id: TeamId): Team {
    const team = teams.find((candidate) => candidate.id === id);
    if (team === undefined) {
      throw new TeamNotFoundError(id);
    }

    return team;
  }

  private async saveEvent(manager: EntityManager, event: SportsEvent): Promise<SportsEvent> {
    const record = this.eventsMapper.toPersistence(event);
    const version = event.version === 0 ? 1 : event.version + 1;
    const stored: SportsEventRecord = { ...record, version };
    const columns = this.eventColumns(stored);

    if (event.version === 0) {
      await manager.createQueryBuilder().insert().into(SportsEventSchema).values(columns).execute();
    } else {
      const { id, ...changes } = columns;
      const result = await manager
        .createQueryBuilder()
        .update(SportsEventSchema)
        .set(changes)
        .where("id = :id AND version = :expectedVersion", {
          id,
          expectedVersion: event.version,
        })
        .execute();

      if (result.affected !== 1) {
        throw new OptimisticLockError(event.id, event.version);
      }
    }

    return this.eventsMapper.toDomain(stored);
  }

  private entityName(schema: { options: { name?: string } }): string {
    if (schema.options.name === undefined) {
      throw new Error("Entity schema name is required");
    }

    return schema.options.name;
  }

  private eventColumns(record: SportsEventRecord): EventColumns {
    const columns: Partial<SportsEventRecord> = { ...record };
    delete columns.homeTeam;
    delete columns.awayTeam;
    return columns as EventColumns;
  }
}
