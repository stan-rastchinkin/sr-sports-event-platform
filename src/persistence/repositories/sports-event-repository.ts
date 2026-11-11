import "reflect-metadata";
import { SportsEventMapper } from "../mappers/sports-event-mapper.js";
import { OptimisticLockError } from "./optimistic-lock-error.js";
import { SportsEventSchema } from "../schemas/sports-event.js";
import { TeamSchema } from "../schemas/team.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type { EventId, SportsEvent } from "../../domain/index.js";
import type { SportsEventRecord } from "../mappers/sports-event-mapper.js";
import type { SportsEventRow } from "../schemas/sports-event.js";
import type { TeamRow } from "../schemas/team.js";

type JoinedSportsEventRow = SportsEventRow & {
  homeTeam: TeamRow;
  awayTeam: TeamRow;
};

type EventColumns = Omit<SportsEventRecord, "homeTeam" | "awayTeam">;

const teamEntityName = entityName(TeamSchema);

@Service()
export class SportsEventRepository {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  @Inject(() => SportsEventMapper)
  private readonly events!: SportsEventMapper;

  public async findById(id: EventId): Promise<SportsEvent | null> {
    const row = (await this.dataSource
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
      )
      .where("event.id = :id", { id })
      .getOne()) as JoinedSportsEventRow | null;

    if (row === null) {
      return null;
    }

    return this.events.toDomain(row);
  }

  /**
   * Saves the SportsEvent. **Currently does not save Teams as part of Aggregate**
   */
  public async save(event: SportsEvent): Promise<SportsEvent> {
    const record = this.events.toPersistence(event);
    const version = event.version === 0 ? 1 : event.version + 1;
    const stored: SportsEventRecord = { ...record, version };
    const columns = eventColumns(stored);

    if (event.version === 0) {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(SportsEventSchema)
        .values(columns)
        .execute();
    } else {
      const { id, ...changes } = columns;
      const result = await this.dataSource
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

    return this.events.toDomain(stored);
  }
}

function entityName(schema: { options: { name?: string } }): string {
  if (schema.options.name === undefined) {
    throw new Error("Entity schema name is required");
  }

  return schema.options.name;
}

function eventColumns(record: SportsEventRecord): EventColumns {
  const columns: Partial<SportsEventRecord> = { ...record };
  delete columns.homeTeam;
  delete columns.awayTeam;
  return columns as EventColumns;
}
