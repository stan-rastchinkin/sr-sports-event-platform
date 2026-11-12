import "reflect-metadata";
import { SportSchema } from "../persistence/schemas/sport.js";
import { pageQuerySchema } from "./page-query.js";
import { validateInput } from "./sports-event-schemas.js";
import { Inject, Service } from "typedi";
import { DataSource } from "typeorm";

import type { SportRow } from "../persistence/schemas/sport.js";
import type { PageQueryInput } from "./page-query.js";

export type ListSportsInput = PageQueryInput;

@Service()
export class SportsService {
  @Inject(() => DataSource)
  private readonly dataSource!: DataSource;

  public listSports(input: ListSportsInput): Promise<SportRow[]> {
    const query = validateInput(pageQuerySchema, input);

    return this.dataSource.getRepository(SportSchema).find({
      order: { id: "ASC" },
      take: query.limit,
      skip: query.offset,
    });
  }
}
