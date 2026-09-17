import "dotenv/config";
import app from "./app";
import prisma from "./config/prisma";
import { connectRedis, disconnectRedis } from "./config/redis";
import logger from "./config/logger";

const ngrok = require("@ngrok/ngrok");

const PORT = parseInt(process.env.PORT || "5000", 10);

async function forwardToApp() {
	const forwarder = await ngrok.forward({
		addr: "localhost:5000",
		authtoken_from_env: true,
		domain: "foam-reusable-capillary.ngrok-free.dev",
    pooling_enabled: true,
	});
	console.log(`Your Public Backend is Available at: ${forwarder.url()}`);
}
 

async function main() {
  // Verify DB connection before starting
  await prisma.$connect();
  logger.info("✅ Database connected.");

  // Connect to Redis
  await connectRedis();

  const server = app.listen(PORT, () => {
    logger.info(
      `🚀 Praxes API running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      await disconnectRedis();
      logger.info("💤 Server closed. Database & Redis disconnected.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err: Error) => {
    logger.error("UNHANDLED REJECTION:", err);
    shutdown("UNHANDLED_REJECTION");
  });
}

main().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});

forwardToApp();