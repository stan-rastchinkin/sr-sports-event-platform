import "reflect-metadata";
import { SportsEventRepositoryToken } from "./application/interfaces/sports-event-repository.js";
import { SportsEventSearchRepositoryToken } from "./application/interfaces/sports-event-search-repository.js";
import "./application/sports-event-service.js";
import "./application/sports-service.js";
import "./application/teams-service.js";
import { SportsEventRepository } from "./persistence/repositories/sports-event-repository.js";
import { SportsEventSearchRepository } from "./persistence/repositories/sports-event-search-repository.js";
import { Container } from "typedi";

Container.set({
  id: SportsEventRepositoryToken,
  type: SportsEventRepository,
});

Container.set({
  id: SportsEventSearchRepositoryToken,
  type: SportsEventSearchRepository,
});
