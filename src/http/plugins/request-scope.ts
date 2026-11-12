import { randomUUID } from "node:crypto";
import { Container } from "typedi";

import type { FastifyInstance } from "fastify";
import type { ContainerInstance } from "typedi";

declare module "fastify" {
  interface FastifyRequest {
    container: ContainerInstance;
  }
}

export function registerRequestScope(app: FastifyInstance): void {
  app.addHook("onRequest", (request, _reply, done) => {
    request.container = Container.of(randomUUID());
    done();
  });

  app.addHook("onResponse", (request, _reply, done) => {
    if (request.container !== undefined) {
      Container.reset(request.container.id);
    }
    done();
  });
}
