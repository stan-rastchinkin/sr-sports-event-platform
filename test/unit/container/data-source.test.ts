import "reflect-metadata";
import { TeamsService } from "../../../src/application/teams-service.js";
import { createDataSource } from "../../../src/persistence/data-source.js";
import { SportsEventRepository } from "../../../src/persistence/repositories/sports-event-repository.js";
import { SportsEventSearchRepository } from "../../../src/persistence/repositories/sports-event-search-repository.js";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { Container } from "typedi";
import { DataSource } from "typeorm";

describe("DataSource", () => {
  const dataSource = createDataSource("postgres://localhost/data-source-singleton");
  let replaced: DataSource | undefined;

  beforeAll(() => {
    replaced = Container.has(DataSource) ? Container.get(DataSource) : undefined;
    Container.set({
      id: DataSource,
      value: dataSource,
      global: true,
    });
  });

  afterAll(() => {
    Container.remove(DataSource);
    if (replaced !== undefined) {
      Container.set({
        id: DataSource,
        value: replaced,
        global: true,
      });
    }
  });

  it("stays one instance across request containers", () => {
    const firstScope = Container.of(randomUUID());
    const secondScope = Container.of(randomUUID());
    const destroy = jest.spyOn(dataSource, "destroy").mockResolvedValue();

    try {
      expect(firstScope.get(DataSource)).toBe(dataSource);
      expect(secondScope.get(DataSource)).toBe(dataSource);
      expect(injectedDataSource(firstScope.get(TeamsService))).toBe(dataSource);
      expect(injectedDataSource(secondScope.get(TeamsService))).toBe(dataSource);
      expect(injectedDataSource(firstScope.get(SportsEventRepository))).toBe(dataSource);
      expect(injectedDataSource(secondScope.get(SportsEventSearchRepository))).toBe(dataSource);

      Container.reset(firstScope.id);
      Container.reset(secondScope.id);

      expect(destroy).not.toHaveBeenCalled();
      expect(Container.get(DataSource)).toBe(dataSource);
    } finally {
      destroy.mockRestore();
    }
  });
});

function injectedDataSource(service: object): DataSource {
  const injected: unknown = Reflect.get(service, "dataSource");
  if (!(injected instanceof DataSource)) {
    throw new Error("Service did not receive the DataSource");
  }
  return injected;
}
