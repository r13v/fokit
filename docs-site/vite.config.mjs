import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const docsRoot = new URL(".", import.meta.url)
const examplesRoot = new URL("../examples", import.meta.url)

export default defineConfig({
	root: docsRoot.pathname,
	base: process.env.BASE_PATH ?? "/",
	plugins: [react()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	server: {
		fs: {
			allow: [docsRoot.pathname, examplesRoot.pathname],
		},
	},
})
