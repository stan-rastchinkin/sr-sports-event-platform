import { bootstrap } from "./bootstrap.js";
import { registerShutdownHandlers } from "./shutdown.js";

const { app, dataSource, env } = await bootstrap();

registerShutdownHandlers(app, dataSource, env.SHUTDOWN_TIMEOUT_MS);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
