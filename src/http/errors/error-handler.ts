import { ApplicationError, NotFoundError, TeamScheduleConflictError } from "../../application/errors.js";
import { DomainError, ValidationError } from "../../domain/index.js";
import { OptimisticLockError } from "../../persistence/repositories/errors.js";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "@fastify/type-provider-zod";

import type { FastifyInstance } from "fastify";

const handlerTimeoutCode = "FST_ERR_HANDLER_TIMEOUT";

const HttpErrorCode = {
  concurrentModification: "CONCURRENT_MODIFICATION",
  domain: "DOMAIN_ERROR",
  internal: "INTERNAL_ERROR",
  notFound: "NOT_FOUND",
  teamScheduleConflict: "TEAM_SCHEDULE_CONFLICT",
  timeout: "REQUEST_TIMEOUT",
  validation: "VALIDATION_ERROR",
} as const;

const internalErrorMessage = "Internal server error";
const timeoutErrorMessage = "The request timed out";
const validationErrorMessage = "Invalid input";

type TranslatedError = {
  statusCode: number;
  code: string;
  message: string;
  eventId?: string;
  teamId?: string;
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const translated = translate(error);
    const details = { err: error, extras: extrasOf(error) };

    if (translated.statusCode >= 500) {
      request.log.error(details, translated.message);
    } else {
      request.log.warn(details, translated.message);
    }

    return reply.status(translated.statusCode).send(responseBody(translated));
  });
}

function translate(error: unknown): TranslatedError {
  if (isHandlerTimeout(error)) {
    return {
      statusCode: 503,
      code: HttpErrorCode.timeout,
      message: timeoutErrorMessage,
    };
  }

  if (hasZodFastifySchemaValidationErrors(error) || error instanceof ValidationError) {
    return {
      statusCode: 422,
      code: HttpErrorCode.validation,
      message: validationErrorMessage,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      statusCode: 404,
      code: HttpErrorCode.notFound,
      message: error.message,
      ...notFoundIds(error.extras),
    };
  }

  if (error instanceof OptimisticLockError) {
    return { statusCode: 409, code: HttpErrorCode.concurrentModification, message: error.message };
  }

  if (error instanceof TeamScheduleConflictError) {
    return { statusCode: 409, code: HttpErrorCode.teamScheduleConflict, message: error.message };
  }

  if (error instanceof DomainError) {
    return { statusCode: 409, code: HttpErrorCode.domain, message: error.message };
  }

  if (isResponseSerializationError(error)) {
    return {
      statusCode: 500,
      code: HttpErrorCode.internal,
      message: internalErrorMessage,
    };
  }

  return {
    statusCode: 500,
    code: HttpErrorCode.internal,
    message: internalErrorMessage,
  };
}

function isHandlerTimeout(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === handlerTimeoutCode
  );
}

function responseBody(translated: TranslatedError): {
  code: string;
  message: string;
  eventId?: string;
  teamId?: string;
} {
  return {
    code: translated.code,
    message: translated.message,
    ...(translated.eventId === undefined ? {} : { eventId: translated.eventId }),
    ...(translated.teamId === undefined ? {} : { teamId: translated.teamId }),
  };
}

function notFoundIds(extras: unknown): { eventId?: string; teamId?: string } {
  if (typeof extras !== "object" || extras === null) {
    return {};
  }

  const ids: { eventId?: string; teamId?: string } = {};
  if ("eventId" in extras && typeof extras.eventId === "string") {
    ids.eventId = extras.eventId;
  }
  if ("teamId" in extras && typeof extras.teamId === "string") {
    ids.teamId = extras.teamId;
  }
  return ids;
}

function extrasOf(error: unknown): unknown {
  if (
    error instanceof DomainError ||
    error instanceof ValidationError ||
    error instanceof ApplicationError
  ) {
    return error.extras;
  }

  return undefined;
}
