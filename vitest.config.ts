import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "node",
					environment: "node",
					include: [
						"src/core/**/*.test.ts",
						"src/devtools/**/*.test.ts",
						"src/history/**/*.test.ts",
						"src/persistence/**/*.test.ts",
						"src/server/**/*.test.ts",
					],
				},
			},
			{
				test: {
					name: "react",
					environment: "jsdom",
					include: [
						"src/react/**/*.test.{ts,tsx}",
						"src/react19/**/*.test.{ts,tsx}",
					],
					setupFiles: ["tests/setup.ts"],
				},
			},
		],
	},
})
