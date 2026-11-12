import { SportsEventService } from "../../application/sports-event-service.js";
import { SportsService } from "../../application/sports-service.js";
import { sportId } from "../../domain/index.js";
import { eventSearchResultListDtoSchema, toEventSearchResultDto } from "../dto-mappers/event.js";
import { sportListDtoSchema, toSportDto } from "../dto-mappers/sport.js";
import { commonErrorResponses } from "../errors/error-response.js";
import { sportIdParamsSchema } from "../schemas/params.js";
import { eventSearchQuerySchema, pageQuerySchema } from "../schemas/query.js";

import type { FastifyPluginCallbackZod } from "@fastify/type-provider-zod";

export function sportsRoutes(): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/sports",
      {
        schema: {
          querystring: pageQuerySchema,
          response: {
            200: sportListDtoSchema,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const sports = await request.container.get(SportsService).listSports({
          limit: request.query.limit,
          offset: request.query.offset,
        });
        return sports.map((sport) => toSportDto(sport));
      },
    );

    app.get(
      "/sports/:sportId/events",
      {
        schema: {
          params: sportIdParamsSchema,
          querystring: eventSearchQuerySchema,
          response: {
            200: eventSearchResultListDtoSchema,
            ...commonErrorResponses,
          },
        },
      },
      async (request) => {
        const events = await request.container.get(SportsEventService).search({
          sportId: sportId(request.params.sportId),
          scheduledAfter:
            request.query.after === undefined ? undefined : new Date(request.query.after),
          scheduledBefore:
            request.query.before === undefined ? undefined : new Date(request.query.before),
          limit: request.query.limit,
          offset: request.query.offset,
          sort: request.query.sort,
        });
        return events.map((event) => toEventSearchResultDto(event));
      },
    );

    done();
  };
}
