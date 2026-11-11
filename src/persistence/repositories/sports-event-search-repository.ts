import "reflect-metadata";
import { SportsEventSchema } from "../schemas/sports-event.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type {
  EventSearchCriteria,
  SportsEventSearchRepository as SportsEventSearchRepositoryPort,
  SportsEventSearchResult,
} from "../../application/interfaces/sports-event-search-repository.js";

@Service()
export class SportsEventSearchRepository implements SportsEventSearchRepositoryPort {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  public async search(criteria: EventSearchCriteria): Promise<SportsEventSearchResult[]> {
    const query = this.dataSource.getRepository(SportsEventSchema).createQueryBuilder("event");

    if (criteria.sportId !== undefined) {
      query.andWhere("event.sportId = :sportId", { sportId: criteria.sportId });
    }
    if (criteria.teamId !== undefined) {
      query.andWhere("(event.homeTeamId = :teamId OR event.awayTeamId = :teamId)", {
        teamId: criteria.teamId,
      });
    }
    if (criteria.status !== undefined) {
      query.andWhere("event.status = :status", { status: criteria.status });
    }
    if (criteria.scheduledAfter !== undefined) {
      query.andWhere("event.scheduledAt > :scheduledAfter", {
        scheduledAfter: criteria.scheduledAfter,
      });
    }
    if (criteria.scheduledBefore !== undefined) {
      query.andWhere("event.scheduledAt <= :scheduledBefore", {
        scheduledBefore: criteria.scheduledBefore,
      });
    }

    return query
      .orderBy("event.scheduledAt", criteria.sort)
      .addOrderBy("event.id", "ASC")
      .limit(criteria.limit)
      .offset(criteria.offset)
      .getMany();
  }
}
