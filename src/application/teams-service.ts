import "reflect-metadata";
import { TeamSchema } from "../persistence/schemas/team.js";
import { pageQuerySchema } from "./page-query.js";
import { validateInput } from "./sports-event-schemas.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type { TeamRow } from "../persistence/schemas/team.js";
import type { PageQueryInput } from "./page-query.js";

export type ListTeamsInput = PageQueryInput;

@Service()
export class TeamsService {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  public listTeams(input: ListTeamsInput): Promise<TeamRow[]> {
    const query = validateInput(pageQuerySchema, input);

    return this.dataSource.getRepository(TeamSchema).find({
      order: { id: "ASC" },
      take: query.limit,
      skip: query.offset,
    });
  }
}
