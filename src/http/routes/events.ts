import { SportsEventService } from "../../application/sports-event-service.js";
import { eventId, sportId, teamId } from "../../domain/index.js";
import { eventDtoSchema, toEventDto } from "../dto-mappers/event.js";
import { commonErrorResponses, conflictResponse, notFoundResponse } from "../errors/error-response.js";
import {
  cancelBodySchema,
  eventIdParamsSchema,
  rescheduleBodySchema,
  scheduleBodySchema,
  timestampBodySchema,
} from "../schemas/events.js";

import type { FastifyPluginCallbackZod } from "@fastify/type-provider-zod";

export function eventsRoutes(): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.post(
      "/events/schedule",
      {
        schema: {
          body: scheduleBodySchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...conflictResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container.get(SportsEventService).schedule({
          sportId: sportId(request.body.sportId),
          homeTeamId: teamId(request.body.homeTeamId),
          awayTeamId: teamId(request.body.awayTeamId),
          scheduledAt: new Date(request.body.scheduledAt),
        });
        return toEventDto(event);
      },
    );

    app.post(
      "/events/:id/reschedule",
      {
        schema: {
          params: eventIdParamsSchema,
          body: rescheduleBodySchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...conflictResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container.get(SportsEventService).reschedule({
          eventId: eventId(request.params.id),
          scheduledAt: new Date(request.body.scheduledAt),
        });
        return toEventDto(event);
      },
    );

    app.post(
      "/events/:id/start",
      {
        schema: {
          params: eventIdParamsSchema,
          body: timestampBodySchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...conflictResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container.get(SportsEventService).start({
          eventId: eventId(request.params.id),
          at: new Date(request.body.at),
        });
        return toEventDto(event);
      },
    );

    app.post(
      "/events/:id/finish",
      {
        schema: {
          params: eventIdParamsSchema,
          body: timestampBodySchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...conflictResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container.get(SportsEventService).finish({
          eventId: eventId(request.params.id),
          at: new Date(request.body.at),
        });
        return toEventDto(event);
      },
    );

    app.post(
      "/events/:id/cancel",
      {
        schema: {
          params: eventIdParamsSchema,
          body: cancelBodySchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...conflictResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container.get(SportsEventService).cancel({
          eventId: eventId(request.params.id),
          reason: request.body.reason,
          at: new Date(request.body.at),
        });
        return toEventDto(event);
      },
    );

    app.get(
      "/events/:id",
      {
        schema: {
          params: eventIdParamsSchema,
          response: {
            200: eventDtoSchema,
            ...notFoundResponse,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const event = await request.container
          .get(SportsEventService)
          .getById(eventId(request.params.id));
        return toEventDto(event);
      },
    );

    done();
  };
}
