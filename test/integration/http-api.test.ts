import { bootstrap, shutdown } from "../../src/bootstrap.js";
import { SportSchema } from "../../src/persistence/schemas/sport.js";
import { TeamSchema } from "../../src/persistence/schemas/team.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { Container } from "typedi";
import { DataSource } from "typeorm";

import type { FastifyInstance } from "fastify";

const sportId = 32120;

describe("HTTP API", () => {
  let app: FastifyInstance;
  const homeTeamId = randomUUID();
  const awayTeamId = randomUUID();

  beforeAll(async () => {
    app = await bootstrap();
    const dataSource = Container.get(DataSource);
    await removeSport(dataSource);
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(SportSchema)
      .values({ id: sportId, name: "HTTP sport" })
      .execute();
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(TeamSchema)
      .values([
        { id: homeTeamId, sportId, name: "Home" },
        { id: awayTeamId, sportId, name: "Away" },
      ])
      .execute();
  });

  afterAll(async () => {
    if (app === undefined) {
      return;
    }

    const dataSource = Container.get(DataSource);
    if (dataSource.isInitialized) {
      await removeSport(dataSource);
    }
    await shutdown(app);
  });

  it("reschedules an event by id and finds it for the team", async () => {
    const scheduled = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: {
        sportId,
        homeTeamId,
        awayTeamId,
        scheduledAt: "2061-01-01T12:00:00.000Z",
      },
    });

    expect(scheduled.statusCode).toBe(200);
    const created: { id: string; version?: number; status: { status: string } } = scheduled.json();
    expect(created.version).toBeUndefined();
    expect(created.status).toEqual({ status: "scheduled" });

    const rescheduled = await app.inject({
      method: "POST",
      url: `/events/${created.id}/reschedule`,
      payload: { scheduledAt: "2061-01-02T12:00:00.000Z" },
    });

    expect(rescheduled.statusCode).toBe(200);
    expect(rescheduled.json()).toMatchObject({
      id: created.id,
      scheduledAt: "2061-01-02T12:00:00.000Z",
    });
    expect(rescheduled.json().version).toBeUndefined();

    const search = await app.inject({
      method: "GET",
      url: `/teams/${homeTeamId}/events?after=2061-01-01T00:00:00.000Z&before=2061-01-03T00:00:00.000Z`,
    });

    expect(search.statusCode).toBe(200);
    const events: { id: string; version?: number }[] = search.json();
    expect(events.map((event) => event.id)).toContain(created.id);
    expect(events.every((event) => event.version === undefined)).toBe(true);
  });

  it("keeps one DataSource for every request", async () => {
    const dataSource = Container.get(DataSource);

    const response = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: {
        sportId,
        homeTeamId,
        awayTeamId,
        scheduledAt: "2061-06-01T12:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(Container.get(DataSource)).toBe(dataSource);
    expect(dataSource.isInitialized).toBe(true);
  });

  it("returns NOT_FOUND with the missing event id", async () => {
    const eventId = randomUUID();
    const response = await app.inject({
      method: "GET",
      url: `/events/${eventId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "NOT_FOUND",
      message: "The event was not found",
      eventId,
    });
  });

  it("returns NOT_FOUND with the missing team id", async () => {
    const missingTeamId = randomUUID();
    const response = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: {
        sportId,
        homeTeamId: missingTeamId,
        awayTeamId,
        scheduledAt: "2061-07-01T12:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "NOT_FOUND",
      message: "The team was not found",
      teamId: missingTeamId,
    });
  });

  it("returns DOMAIN_ERROR when the home and away teams are the same", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: {
        sportId,
        homeTeamId,
        awayTeamId: homeTeamId,
        scheduledAt: "2061-08-01T12:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: "DOMAIN_ERROR",
      message: "Home and away teams must be different",
    });
  });

  it("returns VALIDATION_ERROR when the cancellation reason is blank", async () => {
    const scheduled = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: {
        sportId,
        homeTeamId,
        awayTeamId,
        scheduledAt: "2061-09-01T12:00:00.000Z",
      },
    });
    const created: { id: string } = scheduled.json();

    const response = await app.inject({
      method: "POST",
      url: `/events/${created.id}/cancel`,
      payload: { reason: "   ", at: "2061-09-01T11:00:00.000Z" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
    });
  });

  it("returns VALIDATION_ERROR when the command body is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/events/schedule",
      payload: { sportId: "nope" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
    });
  });

  it("returns VALIDATION_ERROR when the page limit is out of range", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/sports?limit=0",
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
    });
  });

  it("returns VALIDATION_ERROR when the event search range is inverted", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/teams/${homeTeamId}/events?after=2061-02-02T00:00:00.000Z&before=2061-02-01T00:00:00.000Z`,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid input",
    });
  });

  it("serves the OpenAPI documentation", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation",
    });

    expect(response.statusCode).toBe(200);

    const spec = app.swagger();
    expect(spec.paths).toMatchObject({
      "/events/schedule": { post: expect.any(Object) },
      "/events/{id}": { get: expect.any(Object) },
      "/events/{id}/reschedule": { post: expect.any(Object) },
      "/teams": { get: expect.any(Object) },
      "/teams/{teamId}/events": { get: expect.any(Object) },
      "/sports": { get: expect.any(Object) },
      "/sports/{sportId}/events": { get: expect.any(Object) },
    });
    expect(responseExamples(spec, "/events/schedule", "post")[0]).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      sportId: 1,
      homeTeam: { name: "Salzburg" },
      awayTeam: { name: "Sturm" },
      scheduledAt: "2027-01-15T18:30:00Z",
      status: { status: "scheduled" },
    });
    expect(responseExamples(spec, "/teams", "get")[0]).toEqual([
      expect.objectContaining({ name: "Salzburg" }),
      expect.objectContaining({ name: "Sturm" }),
    ]);
    expect(responseExamples(spec, "/teams/{teamId}/events", "get")[0]).toEqual([
      expect.objectContaining({
        status: "scheduled",
        homeTeamId: "550e8400-e29b-41d4-a716-446655440001",
        cancellationReason: null,
      }),
      expect.objectContaining({
        status: "in_progress",
        startedAt: "2027-01-15T18:32:00Z",
      }),
    ]);
    expect(responseExamples(spec, "/sports", "get")[0]).toEqual([
      { id: 1, name: "Football" },
      { id: 2, name: "Basketball" },
    ]);
    expect(requestBodyExamples(spec, "/events/schedule", "post")[0]).toEqual({
      sportId: 1,
      homeTeamId: "550e8400-e29b-41d4-a716-446655440001",
      awayTeamId: "550e8400-e29b-41d4-a716-446655440002",
      scheduledAt: "2027-01-15T18:30:00Z",
    });
  });
});

function responseExamples(
  spec: ReturnType<FastifyInstance["swagger"]>,
  path: string,
  method: "get" | "post",
): unknown[] {
  if (typeof spec === "string" || spec.paths === undefined) {
    throw new Error("OpenAPI document is missing paths");
  }

  const operation = spec.paths[path]?.[method] as
    | {
        responses?: {
          200?: {
            content?: {
              "application/json"?: {
                schema?: { examples?: unknown[] };
                example?: unknown;
                examples?: Record<string, { value?: unknown }>;
              };
            };
          };
        };
      }
    | undefined;
  const mediaType = operation?.responses?.[200]?.content?.["application/json"];
  const schemaExamples = mediaType?.schema?.examples;
  if (Array.isArray(schemaExamples)) {
    return schemaExamples;
  }

  const documented = mediaType?.examples;
  if (documented !== undefined) {
    return Object.values(documented).flatMap((entry) =>
      entry.value === undefined ? [] : [entry.value],
    );
  }

  if (mediaType?.example !== undefined) {
    return [mediaType.example];
  }

  throw new Error(`OpenAPI response for ${method.toUpperCase()} ${path} has no examples`);
}

function requestBodyExamples(
  spec: ReturnType<FastifyInstance["swagger"]>,
  path: string,
  method: "get" | "post",
): unknown[] {
  if (typeof spec === "string" || spec.paths === undefined) {
    throw new Error("OpenAPI document is missing paths");
  }

  const operation = spec.paths[path]?.[method] as
    | {
        requestBody?: {
          content?: {
            "application/json"?: {
              schema?: { examples?: unknown[] };
              example?: unknown;
              examples?: Record<string, { value?: unknown }>;
            };
          };
        };
      }
    | undefined;
  const mediaType = operation?.requestBody?.content?.["application/json"];
  const schemaExamples = mediaType?.schema?.examples;
  if (Array.isArray(schemaExamples)) {
    return schemaExamples;
  }

  const documented = mediaType?.examples;
  if (documented !== undefined) {
    return Object.values(documented).flatMap((entry) =>
      entry.value === undefined ? [] : [entry.value],
    );
  }

  if (mediaType?.example !== undefined) {
    return [mediaType.example];
  }

  throw new Error(`OpenAPI request body for ${method.toUpperCase()} ${path} has no examples`);
}

async function removeSport(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM sports_events WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM teams WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM sports WHERE id = $1`, [sportId]);
}
