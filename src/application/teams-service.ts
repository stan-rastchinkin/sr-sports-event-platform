import "reflect-metadata";
import { TeamSchema } from "../persistence/schemas/team.js";
import { resolvePage } from "./page-query.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type { TeamRow } from "../persistence/schemas/team.js";
import type { PageQuery } from "./page-query.js";

@Service()
export class TeamsService {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  public listTeams(query: PageQuery): Promise<TeamRow[]> {
    const page = resolvePage(query);

    return this.dataSource.getRepository(TeamSchema).find({
      order: { id: "ASC" },
      take: page.limit,
      skip: page.offset,
    });
  }
}
