import "reflect-metadata";
import { SportSchema } from "../persistence/schemas/sport.js";
import { resolvePage } from "./page-query.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type { SportRow } from "../persistence/schemas/sport.js";
import type { PageQuery } from "./page-query.js";

@Service()
export class SportsService {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  public listSports(query: PageQuery): Promise<SportRow[]> {
    const page = resolvePage(query);

    return this.dataSource.getRepository(SportSchema).find({
      order: { id: "ASC" },
      take: page.limit,
      skip: page.offset,
    });
  }
}
