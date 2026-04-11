import { defineConfig } from "@prisma/internals";

export default defineConfig({
  datasources: {
    db: {
      url: {
        fromEnvVar: "DATABASE_URL",
      },
    },
  },
});
