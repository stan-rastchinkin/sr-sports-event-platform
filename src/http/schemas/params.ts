import { z } from "zod";

const eventTeamId = "550e8400-e29b-41d4-a716-446655440001";

const teamIdParamsShape = z.object({
  teamId: z.uuid(),
});

const sportIdParamsShape = z.object({
  sportId: z.coerce.number().int(),
});

export const teamIdParamsSchema = teamIdParamsShape.meta({
  examples: [{ teamId: eventTeamId } satisfies z.input<typeof teamIdParamsShape>],
});

export const sportIdParamsSchema = sportIdParamsShape.meta({
  examples: [{ sportId: "1" } satisfies z.input<typeof sportIdParamsShape>],
});
