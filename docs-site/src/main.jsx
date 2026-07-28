import { BookOpen } from "@phosphor-icons/react"
import { formatPath, parsePath } from "fokit/core"
import { useEffect, useMemo, useSyncExternalStore } from "react"
import { createRoot } from "react-dom/client"

import { curriculum, getLesson } from "./content.js"
import { examples } from "./examples.js"
import {
	applyRouteSideEffects,
	getRouteLinks,
	readSavedLocale,
	resolveRoute,
	routeHash,
} from "./routing.mjs"

function App() {
	const route = useRoute()
	const lesson = getLesson(route.locale, route.lessonId)
	const links = getRouteLinks(route)
	const publicPathExample = formatPath(parsePath("contacts.0.email"))

	useEffect(() => {
		applyRouteSideEffects(route)
		if (route.normalized) {
			window.history.replaceState(null, "", route.hash)
		}
	}, [route])

	return (
		<main>
			<header>
				<BookOpen size={28} aria-hidden="true" />
				<h1>Fokit</h1>
				<a href="https://github.com/r13v/fokit">GitHub</a>
			</header>
			<nav aria-label="Lessons">
				{curriculum[route.locale].map((item) => (
					<a
						aria-current={item.id === lesson.id ? "page" : undefined}
						href={routeHash(route.locale, item.id)}
						key={item.id}
					>
						{item.title}
					</a>
				))}
			</nav>
			<article>
				<p>
					{route.locale === "en" ? "Public path example" : "Пример пути"}:{" "}
					{publicPathExample}
				</p>
				<h2>{lesson.title}</h2>
				<p>{lesson.summary}</p>
				{lesson.sections.map((section) => (
					<p key={section}>{section}</p>
				))}
				{lesson.exampleIds.map((exampleId) => (
					<section key={exampleId}>
						<h3>{examples[exampleId].label}</h3>
						<p>{examples[exampleId].path}</p>
						<pre>
							<code>{examples[exampleId].source}</code>
						</pre>
					</section>
				))}
			</article>
			<footer>
				{links.previous ? (
					<a href={links.previous.hash}>{links.previous.label}</a>
				) : null}
				{links.next ? <a href={links.next.hash}>{links.next.label}</a> : null}
				<a href={links.crossLocale.hash}>{links.crossLocale.label}</a>
			</footer>
		</main>
	)
}

function useRoute() {
	const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
	return useMemo(
		() => resolveRoute(hash, { savedLocale: readSavedLocale() }),
		[hash],
	)
}

function subscribeToHash(callback) {
	window.addEventListener("hashchange", callback)
	return () => window.removeEventListener("hashchange", callback)
}

function readHash() {
	return window.location.hash
}

createRoot(document.getElementById("root")).render(<App />)
