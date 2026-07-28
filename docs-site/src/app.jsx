import {
	BookOpen,
	Check,
	Copy,
	GithubLogo,
	List,
	X,
} from "@phosphor-icons/react"
import { formatPath, parsePath } from "fokit/core"
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react"

import { getLesson, LESSON_IDS } from "./content.js"
import { examples } from "./examples.js"
import { Lab } from "./lab.jsx"
import {
	applyRouteSideEffects,
	getRouteLinks,
	readSavedLocale,
	resolveRoute,
	routeHash,
} from "./routing.mjs"

const lessonGroups = [
	{
		id: "start",
		label: { en: "Start", ru: "Старт" },
		lessonIds: ["overview", "first-form", "controls-and-slots"],
	},
	{
		id: "build",
		label: { en: "Build", ru: "Сборка" },
		lessonIds: [
			"validation-and-conditions",
			"arrays",
			"manual-composition",
			"classic-submit",
		],
	},
	{
		id: "ship",
		label: { en: "Ship", ru: "Релиз" },
		lessonIds: [
			"server-form-data",
			"react19-actions",
			"styling-testing-boundaries",
		],
	},
]

const labels = {
	en: {
		copy: "Copy",
		copied: "Copied",
		close: "Close",
		examples: "Examples",
		lesson: "Lesson",
		next: "Next",
		notes: "Notes",
		of: "of",
		previous: "Previous",
		related: "Related lessons",
		takeaways: "Takeaways",
	},
	ru: {
		copy: "Копировать",
		copied: "Скопировано",
		close: "Закрыть",
		examples: "Примеры",
		lesson: "Урок",
		next: "Далее",
		notes: "Заметки",
		of: "из",
		previous: "Назад",
		related: "Связанные уроки",
		takeaways: "Главное",
	},
}

export function App() {
	const route = useRoute()
	const lesson = getLesson(route.locale, route.lessonId)
	const links = getRouteLinks(route)
	const copyResetRef = useRef()
	const titleRef = useRef(null)
	const previousRouteRef = useRef(null)
	const isDrawerMode = useDrawerMode()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [copiedExampleId, setCopiedExampleId] = useState()
	const t = labels[route.locale]
	const lessonIndex = LESSON_IDS.indexOf(lesson.id) + 1
	const publicPathExample = formatPath(parsePath("contacts.0.email"))
	const routeKey = `${route.locale}/${route.lessonId}`

	useEffect(() => {
		applyRouteSideEffects(route)
		if (route.normalized) {
			window.history.replaceState(null, "", route.hash)
		}

		const shouldFocus =
			previousRouteRef.current !== null && previousRouteRef.current !== routeKey
		previousRouteRef.current = routeKey
		setDrawerOpen(false)

		if (shouldFocus) {
			window.requestAnimationFrame(() => titleRef.current?.focus())
		}
	}, [route, routeKey])

	useEffect(() => {
		if (!drawerOpen) {
			return undefined
		}

		const closeOnEscape = (event) => {
			if (event.key === "Escape") {
				setDrawerOpen(false)
			}
		}

		window.addEventListener("keydown", closeOnEscape)
		return () => window.removeEventListener("keydown", closeOnEscape)
	}, [drawerOpen])

	useEffect(
		() => () => {
			window.clearTimeout(copyResetRef.current)
		},
		[],
	)

	async function copyExample(exampleId) {
		const example = examples[exampleId]
		try {
			await navigator.clipboard?.writeText(example.source)
		} catch {
			// Copy feedback still helps in browsers that block clipboard access.
		}

		window.clearTimeout(copyResetRef.current)
		setCopiedExampleId(exampleId)
		copyResetRef.current = window.setTimeout(
			() => setCopiedExampleId(undefined),
			1600,
		)
	}

	return (
		<div className="site-shell">
			<button
				className="skip-link"
				onClick={() => titleRef.current?.focus()}
				type="button"
			>
				Skip to lesson
			</button>
			<header className="topbar">
				<a className="brand" href={routeHash(route.locale, "overview")}>
					<BookOpen size={30} weight="duotone" aria-hidden="true" />
					<span className="brand-name">Fokit</span>
				</a>
				<div className="topbar-actions">
					<nav aria-label="Language" className="locale-switch">
						<a
							aria-current={route.locale === "en" ? "true" : undefined}
							aria-label="Switch to English"
							href={routeHash("en", lesson.id)}
						>
							EN
						</a>
						<a
							aria-current={route.locale === "ru" ? "true" : undefined}
							aria-label="Switch to Russian"
							href={routeHash("ru", lesson.id)}
						>
							RU
						</a>
					</nav>
					<a
						aria-label="Fokit GitHub"
						className="github-link"
						href="https://github.com/r13v/fokit"
						rel="noreferrer"
						target="_blank"
					>
						<GithubLogo size={20} aria-hidden="true" />
						<span className="github-text">GitHub</span>
					</a>
					<button
						aria-expanded={drawerOpen}
						aria-label={drawerOpen ? "Close lessons" : "Open lessons"}
						className="drawer-toggle"
						onClick={() => setDrawerOpen((open) => !open)}
						type="button"
					>
						{drawerOpen ? (
							<X size={22} aria-hidden="true" />
						) : (
							<List size={22} aria-hidden="true" />
						)}
					</button>
				</div>
			</header>

			<div className="workspace">
				<button
					aria-label="Close lessons"
					className="drawer-backdrop"
					data-open={String(isDrawerMode && drawerOpen)}
					onClick={() => setDrawerOpen(false)}
					tabIndex={isDrawerMode && drawerOpen ? 0 : -1}
					type="button"
				/>
				<aside
					aria-hidden={isDrawerMode && !drawerOpen ? "true" : undefined}
					className="lesson-drawer"
					data-open={String(isDrawerMode ? drawerOpen : true)}
					data-testid="lesson-drawer"
					inert={isDrawerMode && !drawerOpen ? true : undefined}
				>
					<div className="drawer-header">
						<span>{t.lesson}</span>
						<button
							aria-label="Close lessons"
							onClick={() => setDrawerOpen(false)}
							type="button"
						>
							<X size={18} aria-hidden="true" />
							<span>{t.close}</span>
						</button>
					</div>
					<CurriculumNav
						locale={route.locale}
						currentLessonId={lesson.id}
						onNavigate={() => setDrawerOpen(false)}
					/>
				</aside>

				<main className="lesson-page">
					<section className="lesson-hero" aria-labelledby="lesson-title">
						<p className="lesson-kicker">
							{t.lesson} {lessonIndex} {t.of} {LESSON_IDS.length}
						</p>
						<h1
							data-testid="lesson-title"
							id="lesson-title"
							ref={titleRef}
							tabIndex={-1}
						>
							{lesson.title}
						</h1>
						<p className="lesson-summary">{lesson.summary}</p>
					</section>

					<div className="lesson-grid">
						<section className="takeaways" aria-labelledby="takeaways-title">
							<h2 id="takeaways-title">{t.takeaways}</h2>
							<ul>
								{lesson.sections.map((section) => (
									<li key={section}>{section}</li>
								))}
							</ul>
						</section>

						<section className="notes" aria-labelledby="notes-title">
							<h2 id="notes-title">{t.notes}</h2>
							<p>
								{route.locale === "en"
									? `Canonical path example: ${publicPathExample}.`
									: `Канонический пример пути: ${publicPathExample}.`}
							</p>
							<nav className="related-links" aria-label={t.related}>
								{lesson.links.map((link) => {
									const related = getLesson(route.locale, link.lessonId)
									return (
										<a
											href={routeHash(route.locale, related.id)}
											key={related.id}
										>
											{related.title}
										</a>
									)
								})}
							</nav>
						</section>
					</div>

					<Lab locale={route.locale} />

					<section className="examples" aria-labelledby="examples-title">
						<h2 id="examples-title">{t.examples}</h2>
						{lesson.exampleIds.map((exampleId) => {
							const example = examples[exampleId]
							const copied = copiedExampleId === exampleId
							return (
								<section
									aria-labelledby={`example-${exampleId}`}
									className="example-panel"
									key={exampleId}
								>
									<div className="example-toolbar">
										<div>
											<h3 id={`example-${exampleId}`}>{example.label}</h3>
											<p>{example.path}</p>
										</div>
										<button
											aria-label={`${copied ? "Copied" : "Copy"} ${example.path}`}
											className="copy-button"
											onClick={() => copyExample(exampleId)}
											type="button"
										>
											{copied ? (
												<Check size={18} aria-hidden="true" />
											) : (
												<Copy size={18} aria-hidden="true" />
											)}
											<span>{copied ? t.copied : t.copy}</span>
										</button>
									</div>
									<pre data-testid="example-code">
										<code>{example.source}</code>
									</pre>
								</section>
							)
						})}
					</section>

					<nav aria-label="Lesson pagination" className="lesson-pagination">
						{links.previous ? (
							<a
								aria-label={`Previous lesson: ${links.previous.label}`}
								className="page-link previous"
								href={links.previous.hash}
							>
								<span className="page-link-label">{t.previous}</span>
								<strong>{links.previous.label}</strong>
							</a>
						) : (
							<span className="page-link placeholder" />
						)}
						{links.next ? (
							<a
								aria-label={`Next lesson: ${links.next.label}`}
								className="page-link next"
								href={links.next.hash}
							>
								<span className="page-link-label">{t.next}</span>
								<strong>{links.next.label}</strong>
							</a>
						) : (
							<span className="page-link placeholder" />
						)}
					</nav>
				</main>
			</div>
		</div>
	)
}

function CurriculumNav({ locale, currentLessonId, onNavigate }) {
	return (
		<nav aria-label="Curriculum" className="curriculum">
			{lessonGroups.map((group) => (
				<section className="curriculum-group" key={group.id}>
					<h2>{group.label[locale]}</h2>
					<ol>
						{group.lessonIds.map((lessonId) => {
							const lesson = getLesson(locale, lessonId)
							return (
								<li key={lesson.id}>
									<a
										aria-current={
											lesson.id === currentLessonId ? "page" : undefined
										}
										href={routeHash(locale, lesson.id)}
										onClick={onNavigate}
									>
										<span className="lesson-number">
											{LESSON_IDS.indexOf(lesson.id) + 1}
										</span>
										{lesson.title}
									</a>
								</li>
							)
						})}
					</ol>
				</section>
			))}
		</nav>
	)
}

function useRoute() {
	const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
	return useMemo(
		() => resolveRoute(hash, { savedLocale: readSavedLocale() }),
		[hash],
	)
}

function useDrawerMode() {
	return useSyncExternalStore(
		subscribeToDrawerQuery,
		readDrawerQuery,
		() => false,
	)
}

function subscribeToHash(callback) {
	window.addEventListener("hashchange", callback)
	return () => window.removeEventListener("hashchange", callback)
}

function subscribeToDrawerQuery(callback) {
	const query = window.matchMedia("(max-width: 820px)")
	query.addEventListener("change", callback)
	return () => query.removeEventListener("change", callback)
}

function readHash() {
	return window.location.hash
}

function readDrawerQuery() {
	return window.matchMedia("(max-width: 820px)").matches
}
