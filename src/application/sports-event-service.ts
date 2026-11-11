import "reflect-metadata";
import { eventId } from "../domain/index.js";
import { SportsEventRepositoryToken } from "./interfaces/sports-event-repository.js";
import { SportsEventSearchRepositoryToken } from "./interfaces/sports-event-search-repository.js";
import {
  cancelEventCommandSchema,
  finishEventCommandSchema,
  getEventQuerySchema,
  rescheduleEventCommandSchema,
  scheduleEventCommandSchema,
  searchEventsQuerySchema,
  startEventCommandSchema,
  validateInput,
} from "./sports-event-schemas.js";
import { randomUUID } from "node:crypto";
import { Inject, Service } from "typedi";
import { z } from "zod";

import type { SportsEvent } from "../domain/index.js";
import type { SportsEventRepository } from "./interfaces/sports-event-repository.js";
import type { SportsEventSearchRepository, SportsEventSearchResult } from "./interfaces/sports-event-search-repository.js";

const EVENT_DURATION_MS = 90 * 60 * 1000;

export type ScheduleEventInput = z.input<typeof scheduleEventCommandSchema>;
export type RescheduleEventInput = z.input<typeof rescheduleEventCommandSchema>;
export type StartEventInput = z.input<typeof startEventCommandSchema>;
export type FinishEventInput = z.input<typeof finishEventCommandSchema>;
export type CancelEventInput = z.input<typeof cancelEventCommandSchema>;
export type SearchEventsInput = z.input<typeof searchEventsQuerySchema>;

@Service()
export class SportsEventService {
  @Inject(SportsEventRepositoryToken)
  private readonly eventsRepo!: SportsEventRepository;

  @Inject(SportsEventSearchRepositoryToken)
  private readonly eventsSearchRepo!: SportsEventSearchRepository;

  public async schedule(input: ScheduleEventInput): Promise<SportsEvent> {
    const command = validateInput(scheduleEventCommandSchema, input);

    return this.eventsRepo.schedule({
      id: eventId(randomUUID()),
      sportId: command.sportId,
      homeTeamId: command.homeTeamId,
      awayTeamId: command.awayTeamId,
      scheduledAt: command.scheduledAt,
      durationMs: EVENT_DURATION_MS,
    });
  }

  public async reschedule(input: RescheduleEventInput): Promise<SportsEvent> {
    const command = validateInput(rescheduleEventCommandSchema, input);

    return this.eventsRepo.reschedule({
      id: command.eventId,
      scheduledAt: command.scheduledAt,
      durationMs: EVENT_DURATION_MS,
    });
  }

  public async start(input: StartEventInput): Promise<SportsEvent> {
    const command = validateInput(startEventCommandSchema, input);
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.start(command.at);
    return this.eventsRepo.save(event);
  }

  public async finish(input: FinishEventInput): Promise<SportsEvent> {
    const command = validateInput(finishEventCommandSchema, input);
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.finish(command.at);
    return this.eventsRepo.save(event);
  }

  public async cancel(input: CancelEventInput): Promise<SportsEvent> {
    const command = validateInput(cancelEventCommandSchema, input);
    const event = await this.eventsRepo.findByIdOrFail(command.eventId);
    event.cancel(command.reason, command.at);
    return this.eventsRepo.save(event);
  }

  public getById(id: string): Promise<SportsEvent> {
    return this.eventsRepo.findByIdOrFail(validateInput(getEventQuerySchema, id));
  }

  public async search(input: SearchEventsInput): Promise<SportsEventSearchResult[]> {
    const query = validateInput(searchEventsQuerySchema, input);
    return this.eventsSearchRepo.search(query);
  }
}
