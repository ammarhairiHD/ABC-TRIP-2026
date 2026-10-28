import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrationsPath = path.join(import.meta.dirname, "api/migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // Fixed test-only values -- never the real secrets, and never
            // read from .dev.vars, so these tests don't depend on (or risk
            // leaking) anything from a developer's local setup.
            // Salt aa*16 : HMAC-SHA256(salt, "unit-test-code-0000").
            EDITOR_CODE_HASH:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:6970be1e5e8e65254c6e9f7a036eeaba5fcec11ed71ef8a5f36d7e6c6da0735a",
            // Salt bb*16 : HMAC-SHA256(salt, "unit-test-code-0000").
            DOWNLOAD_CODE_HASH:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:d71a53e6a95e51ade0b5ef20308cf9287997960b6303619a70b1d106a686821a",
            TOKEN_SECRET: "test-token-secret-do-not-use-in-production",
            // On in tests by default so most download.test.ts cases don't
            // need per-test setup; one dedicated test flips this to "false".
            DOWNLOADS_ENABLED: "true",
          },
        },
      }),
    ],
    test: {
      // Scoped to api/test: web/ has its own Playwright *.spec.ts suite,
      // which isn't meant to run inside the Workers pool.
      include: ["api/test/**/*.test.ts"],
      setupFiles: ["./api/test/apply-migrations.ts"],
    },
  };
});
