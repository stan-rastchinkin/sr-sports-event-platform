import { bootstrap } from "./bootstrap.js";

const host = "0.0.0.0";
const port = 3000;

const app = await bootstrap();

const stop = (signal: NodeJS.Signals): void => {
  app.log.info({ signal }, "shutting down");
  void app.close().catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
