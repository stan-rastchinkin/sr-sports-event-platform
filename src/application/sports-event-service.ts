import "reflect-metadata";
import { eventId } from "../domain/index.js";
import { SportsEventRepositoryToken } from "./interfaces/sports-event-repository.js";
import { SportsEventSearchRepositoryToken } from "./interfaces/sports-event-search-repository.js";
import { resolvePage } from "./page-query.js";
import { randomUUID } from "node:crypto";
import { Inject, Service } from "typedi";

import type { EventId, SportsEvent } from "../domain/index.js";
import type { SportsEventRepository } from "./interfaces/sports-event-repository.js";
import type {
  SportsEventSearchRepository,
  SportsEventSearchResult,
} from "./interfaces/sports-event-search-repository.js";
import type {
  CancelEventCommand,
  FinishEventCommand,
  RescheduleEventCommand,
  ScheduleEventCommand,
  SearchEventsQuery,
  StartEventCommand,
} from "./sports-event-commands.js";

const EVENT_DURATION_MS = 90 * 60 * 1000;

@Service()
export class SportsEventService {
  @Inject(SportsEventRepositoryToken)
  private readonly eventsRepo!: SportsEventRepository;

  @Inject(SportsEventSearchRepositoryToken)
  private readonly eventsSearchRepo!: SportsEventSearchRepository;

  public schedule(command: ScheduleEventCommand): Promise<SportsEvent> {
    return this.eventsRepo.schedule({
      id: eventId(randomUUID()),
      sportId: command.sportId,
      homeTeamId: command.homeTeamId,
      awayTeamId: command.awayTeamId,
      scheduledAt: command.scheduledAt,
      durationMs: EVENT_DURATION_MS,
    });
  }

  public reschedule(command: RescheduleEventCommand): Promise<SportsEvent> {
    return this.eventsRepo.reschedule({
      id: command.eventId,
      scheduledAt: command.scheduledAt,
      durationMs: EVENT_DURATION_MS,
    });
  }

  public async start(command: StartEventCommand): Promise<SportsEvent> {
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.start(command.at);
    return this.eventsRepo.save(event);
  }

  public async finish(command: FinishEventCommand): Promise<SportsEvent> {
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.finish(command.at);
    return this.eventsRepo.save(event);
  }

  public async cancel(command: CancelEventCommand): Promise<SportsEvent> {
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.cancel(command.reason, command.at);
    return this.eventsRepo.save(event);
  }

  public getById(id: EventId): Promise<SportsEvent> {
    return this.eventsRepo.findByIdOrFail(id);
  }

  public search(query: SearchEventsQuery): Promise<SportsEventSearchResult[]> {
    const page = resolvePage(query);

    return this.eventsSearchRepo.search({
      sportId: query.sportId,
      teamId: query.teamId,
      status: query.status,
      scheduledAfter: query.scheduledAfter,
      scheduledBefore: query.scheduledBefore,
      limit: page.limit,
      offset: page.offset,
      sort: query.sort === "desc" ? "DESC" : "ASC",
    });
  }
}
