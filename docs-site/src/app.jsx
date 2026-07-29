import {
	ArrowLeft,
	ArrowRight,
	BookOpen,
	Check,
	Copy,
	GithubLogo,
	List,
	X,
} from "@phosphor-icons/react"
import {
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react"

import { getPage, PAGE_IDS } from "./content.js"
import { examples } from "./examples.js"
import {
	applyRouteSideEffects,
	getRouteLinks,
	readSavedLocale,
	resolveRoute,
	routeHash,
} from "./routing.mjs"

const Lab = lazy(() =>
	import("./lab.jsx").then((module) => ({ default: module.Lab })),
)
const drawerFocusableSelector =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const labels = {
	en: {
		closeNavigation: "Close navigation",
		copied: "Copied",
		copy: "Copy",
		fullExample: "Open complete example",
		liveLab: "Live lab",
		liveLabLoading: "Loading interactive lab…",
		menu: "Menu",
		next: "Next",
		onThisPage: "On this page",
		openNavigation: "Open navigation",
		previous: "Previous",
		skip: "Skip to content",
	},
	ru: {
		closeNavigation: "Закрыть навигацию",
		copied: "Скопировано",
		copy: "Копировать",
		fullExample: "Открыть полный пример",
		liveLab: "Живая лаборатория",
		liveLabLoading: "Загружаем интерактивную лабораторию…",
		menu: "Меню",
		next: "Далее",
		onThisPage: "На этой странице",
		openNavigation: "Открыть навигацию",
		previous: "Назад",
		skip: "К содержанию",
	},
}

const syntaxPattern =
	/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|\b(?:as|async|await|const|else|export|extends|false|from|function|if|import|interface|null|readonly|return|satisfies|true|type|undefined)\b|\b\d+(?:\.\d+)?\b)/gm

export function App() {
	const route = useRoute()
	const page = getPage(route.locale, route.pageId)
	const routeLinks = getRouteLinks(route)
	const titleRef = useRef(null)
	const copyResetRef = useRef()
	const drawerCloseRef = useRef(null)
	const drawerRef = useRef(null)
	const drawerToggleRef = useRef(null)
	const drawerWasOpenRef = useRef(false)
	const previousRouteRef = useRef(null)
	const previousSectionRef = useRef()
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [copiedBlockId, setCopiedBlockId] = useState()
	const t = labels[route.locale]
	const routeKey = `${route.locale}/${route.pageId}`
	const sectionLinks = useMemo(
		() => [
			...(page.introNavLabel
				? [
						{
							hash: routeHash(route.locale, page.id),
							id: "page-title",
							label: page.introNavLabel,
						},
					]
				: []),
			...page.sections.map((section) => ({
				hash: routeHash(route.locale, page.id, section.id),
				id: section.id,
				label: section.navLabel,
			})),
			...(page.showLab
				? [
						{
							hash: routeHash(route.locale, page.id, "live-lab"),
							id: "live-lab",
							label: t.liveLab,
						},
					]
				: []),
		],
		[page, route.locale, t.liveLab],
	)
	const activeSectionId = useActiveSection(sectionLinks)

	useEffect(() => {
		let cancelled = false
		let frameId
		let sectionObserver
		let sectionResizeObserver
		let settleTimeout
		applyRouteSideEffects(route)
		if (route.normalized) {
			window.history.replaceState(null, "", route.hash)
		}

		const routeChanged =
			previousRouteRef.current !== null && previousRouteRef.current !== routeKey
		const sectionChanged =
			previousRouteRef.current !== null &&
			previousSectionRef.current !== route.sectionId
		previousRouteRef.current = routeKey
		previousSectionRef.current = route.sectionId
		setDrawerOpen(false)

		if (route.sectionId) {
			const alignSection = () =>
				!cancelled &&
				scrollToSection(route.sectionId, {
					behavior: "auto",
				})
			const main = document.querySelector(".docs-main")
			if (main && typeof ResizeObserver !== "undefined") {
				sectionResizeObserver = new ResizeObserver(alignSection)
				sectionResizeObserver.observe(main)
			}
			frameId = window.requestAnimationFrame(() => {
				if (alignSection()) {
					return
				}

				sectionObserver = new MutationObserver(() => {
					if (alignSection()) {
						sectionObserver.disconnect()
					}
				})
				sectionObserver.observe(
					document.querySelector(".docs-main") ?? document.body,
					{ childList: true, subtree: true },
				)
			})
			document.fonts?.ready.then(alignSection)
			settleTimeout = window.setTimeout(() => {
				alignSection()
				sectionResizeObserver?.disconnect()
			}, 800)
		} else if (routeChanged) {
			frameId = window.requestAnimationFrame(() => {
				window.scrollTo({ top: 0 })
				titleRef.current?.focus()
			})
		} else if (sectionChanged) {
			frameId = window.requestAnimationFrame(() => {
				scrollToSection("page-title", { behavior: "auto" })
			})
		}

		return () => {
			cancelled = true
			if (frameId !== undefined) {
				window.cancelAnimationFrame(frameId)
			}
			window.clearTimeout(settleTimeout)
			sectionObserver?.disconnect()
			sectionResizeObserver?.disconnect()
		}
	}, [route, routeKey])

	useEffect(() => {
		if (!drawerOpen) {
			if (drawerWasOpenRef.current) {
				drawerWasOpenRef.current = false
				drawerToggleRef.current?.focus()
			}
			return undefined
		}

		drawerWasOpenRef.current = true
		const previousOverflow = document.documentElement.style.overflow
		document.documentElement.style.overflow = "hidden"
		drawerCloseRef.current?.focus()

		const containDrawerFocus = (event) => {
			if (event.key === "Escape") {
				setDrawerOpen(false)
				return
			}

			if (event.key !== "Tab" || !drawerRef.current) {
				return
			}

			const focusableElements = Array.from(
				drawerRef.current.querySelectorAll(drawerFocusableSelector),
			)
			const firstElement = focusableElements[0]
			const lastElement = focusableElements.at(-1)

			if (
				event.shiftKey &&
				(document.activeElement === firstElement ||
					!drawerRef.current.contains(document.activeElement))
			) {
				event.preventDefault()
				lastElement?.focus()
			} else if (
				!event.shiftKey &&
				(document.activeElement === lastElement ||
					!drawerRef.current.contains(document.activeElement))
			) {
				event.preventDefault()
				firstElement?.focus()
			}
		}

		window.addEventListener("keydown", containDrawerFocus)
		return () => {
			window.removeEventListener("keydown", containDrawerFocus)
			document.documentElement.style.overflow = previousOverflow
		}
	}, [drawerOpen])

	useEffect(
		() => () => {
			window.clearTimeout(copyResetRef.current)
		},
		[],
	)

	async function copySource(blockId, source) {
		try {
			await navigator.clipboard?.writeText(source)
		} catch {
			// Copy feedback still helps when a browser blocks clipboard access.
		}

		window.clearTimeout(copyResetRef.current)
		setCopiedBlockId(blockId)
		copyResetRef.current = window.setTimeout(
			() => setCopiedBlockId(undefined),
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
				{t.skip}
			</button>

			<SiteHeader
				drawerOpen={drawerOpen}
				inert={drawerOpen ? true : undefined}
				locale={route.locale}
				onDrawerToggle={() => setDrawerOpen((open) => !open)}
				pageId={page.id}
				sectionId={route.sectionId}
				t={t}
				toggleRef={drawerToggleRef}
			/>

			<button
				aria-hidden="true"
				className="drawer-backdrop"
				data-open={String(drawerOpen)}
				onClick={() => setDrawerOpen(false)}
				tabIndex={-1}
				type="button"
			/>

			<MobileDrawer
				activeSectionId={activeSectionId}
				closeRef={drawerCloseRef}
				drawerRef={drawerRef}
				locale={route.locale}
				onClose={() => setDrawerOpen(false)}
				open={drawerOpen}
				page={page}
				sectionLinks={sectionLinks}
				t={t}
			/>

			<div className="docs-layout" inert={drawerOpen ? true : undefined}>
				<MetaRail groups={page.metaGroups} />

				<main className="docs-main" id="main-content">
					<header className="page-hero">
						<h1
							data-testid="page-title"
							id="page-title"
							ref={titleRef}
							tabIndex={-1}
						>
							{page.title}
						</h1>
						<p className="page-subtitle">{page.subtitle}</p>
						<p className="page-lead">{page.lead}</p>
					</header>

					<div className="page-content">
						{page.sections.map((section) => (
							<ContentSection
								copiedBlockId={copiedBlockId}
								key={section.id}
								locale={route.locale}
								onCopy={copySource}
								section={section}
								t={t}
							/>
						))}
					</div>

					{page.showLab ? (
						<Suspense
							fallback={
								<p aria-live="polite" className="lab-loading">
									{t.liveLabLoading}
								</p>
							}
						>
							<Lab locale={route.locale} />
						</Suspense>
					) : null}

					<PagePagination links={routeLinks} t={t} />
				</main>

				<TableOfContents
					activeSectionId={activeSectionId}
					links={sectionLinks}
					title={t.onThisPage}
				/>
			</div>
		</div>
	)
}

function SiteHeader({
	drawerOpen,
	inert,
	locale,
	onDrawerToggle,
	pageId,
	sectionId,
	t,
	toggleRef,
}) {
	return (
		<header className="topbar" inert={inert}>
			<a className="brand" href={routeHash(locale, "get-started")}>
				<BookOpen aria-hidden="true" size={27} weight="regular" />
				<span>Fokit</span>
			</a>

			<GlobalNav className="global-nav" locale={locale} pageId={pageId} />

			<div className="topbar-actions">
				<nav aria-label="Language" className="locale-switch">
					<a
						aria-current={locale === "en" ? "true" : undefined}
						aria-label="Switch to English"
						href={routeHash("en", pageId, sectionId)}
					>
						EN
					</a>
					<a
						aria-current={locale === "ru" ? "true" : undefined}
						aria-label="Switch to Russian"
						href={routeHash("ru", pageId, sectionId)}
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
					<GithubLogo aria-hidden="true" size={20} weight="fill" />
					<span>GitHub</span>
				</a>
				<button
					aria-controls="navigation-drawer"
					aria-expanded={drawerOpen}
					aria-label={t.openNavigation}
					className="drawer-toggle"
					onClick={onDrawerToggle}
					ref={toggleRef}
					type="button"
				>
					<List aria-hidden="true" size={22} />
					<span>{t.menu}</span>
				</button>
			</div>
		</header>
	)
}

function GlobalNav({ className, locale, onNavigate, pageId }) {
	return (
		<nav aria-label="Documentation" className={className}>
			{PAGE_IDS.map((navigationPageId) => {
				const navigationPage = getPage(locale, navigationPageId)
				return (
					<a
						aria-current={navigationPageId === pageId ? "page" : undefined}
						href={routeHash(locale, navigationPageId)}
						key={navigationPageId}
						onClick={onNavigate}
					>
						{navigationPage.title}
					</a>
				)
			})}
		</nav>
	)
}

function MobileDrawer({
	activeSectionId,
	closeRef,
	drawerRef,
	locale,
	onClose,
	open,
	page,
	sectionLinks,
	t,
}) {
	return (
		<aside
			aria-hidden={!open ? "true" : undefined}
			aria-labelledby="navigation-drawer-title"
			aria-modal={open ? "true" : undefined}
			className="mobile-drawer"
			data-open={String(open)}
			data-testid="navigation-drawer"
			id="navigation-drawer"
			inert={!open ? true : undefined}
			ref={drawerRef}
			role="dialog"
		>
			<div className="drawer-header">
				<strong id="navigation-drawer-title">{t.menu}</strong>
				<button
					aria-label={t.closeNavigation}
					onClick={onClose}
					ref={closeRef}
					type="button"
				>
					<X aria-hidden="true" size={20} />
				</button>
			</div>
			<GlobalNav
				className="drawer-global-nav"
				locale={locale}
				onNavigate={onClose}
				pageId={page.id}
			/>
			<nav aria-label={t.onThisPage} className="drawer-page-nav">
				<p>{t.onThisPage}</p>
				{sectionLinks.map((link) => (
					<a
						aria-current={link.id === activeSectionId ? "location" : undefined}
						href={link.hash}
						key={link.id}
						onClick={onClose}
					>
						{link.label}
					</a>
				))}
			</nav>
		</aside>
	)
}

function MetaRail({ groups }) {
	return (
		<aside aria-label="Page notes" className="meta-rail">
			{groups.map((group) => (
				<section className="meta-group" key={group.label}>
					<h2>{group.label}</h2>
					<ul>
						{group.items.map((item) => (
							<li key={typeof item === "string" ? item : item.label}>
								{typeof item === "string" ? (
									item
								) : (
									<a
										href={item.href}
										rel={
											item.href.startsWith("http") ? "noreferrer" : undefined
										}
										target={item.href.startsWith("http") ? "_blank" : undefined}
									>
										{item.label}
									</a>
								)}
							</li>
						))}
					</ul>
				</section>
			))}
		</aside>
	)
}

function TableOfContents({ activeSectionId, links, title }) {
	return (
		<aside className="toc-rail">
			<nav aria-label={title}>
				<h2>{title}</h2>
				{links.map((link) => (
					<a
						aria-current={link.id === activeSectionId ? "location" : undefined}
						href={link.hash}
						key={link.id}
					>
						{link.label}
					</a>
				))}
			</nav>
		</aside>
	)
}

function ContentSection({ copiedBlockId, locale, onCopy, section, t }) {
	return (
		<section
			aria-labelledby={`section-${section.id}`}
			className="content-section"
			data-section-id={section.id}
			id={section.id}
		>
			<div className="section-marker" />
			<h2 id={`section-${section.id}`}>{section.title}</h2>

			{section.paragraphs.map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}

			{section.bullets.length > 0 ? (
				<ul className="content-list">
					{section.bullets.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : null}

			{section.items.length > 0 ? <ApiList items={section.items} /> : null}

			{section.code ? (
				<CodeBlock
					copied={copiedBlockId === `${section.id}:${section.code.id}`}
					id={`${section.id}:${section.code.id}`}
					label={section.code.label}
					onCopy={onCopy}
					source={section.code.source}
					t={t}
				/>
			) : null}

			{section.callout ? (
				<aside className="callout">
					<strong>{section.callout.title}</strong>
					<p>{section.callout.text}</p>
				</aside>
			) : null}

			{section.exampleId ? (
				<FullExample
					copiedBlockId={copiedBlockId}
					exampleId={section.exampleId}
					locale={locale}
					onCopy={onCopy}
					t={t}
				/>
			) : null}
		</section>
	)
}

function ApiList({ items }) {
	return (
		<dl className="api-list">
			{items.map((item) => (
				<div key={item.name}>
					<dt>
						<code>{item.name}</code>
					</dt>
					<dd>{item.description}</dd>
				</div>
			))}
		</dl>
	)
}

function FullExample({ copiedBlockId, exampleId, onCopy, t }) {
	const example = examples[exampleId]
	const blockId = `example:${exampleId}`

	return (
		<section aria-label={example.label} className="full-example">
			<details>
				<summary>
					<span>{t.fullExample}</span>
					<code>{example.path}</code>
				</summary>
				<CodeBlock
					copied={copiedBlockId === blockId}
					id={blockId}
					label={example.path}
					onCopy={onCopy}
					source={example.source}
					t={t}
				/>
			</details>
		</section>
	)
}

function CodeBlock({ copied, id, label, onCopy, source, t }) {
	const compact = label === "Shell" && !source.includes("\n")

	return (
		<section
			aria-label={label}
			className={`code-block${compact ? " compact" : ""}`}
		>
			<div className="code-toolbar">
				<span className="code-label">{label}</span>
				<button
					aria-label={`${copied ? t.copied : t.copy} ${label}`}
					onClick={() => onCopy(id, source)}
					type="button"
				>
					{copied ? (
						<Check aria-hidden="true" size={18} />
					) : (
						<Copy aria-hidden="true" size={18} />
					)}
					<span>{copied ? t.copied : t.copy}</span>
				</button>
			</div>
			<pre data-testid="example-code">
				<code>{highlightSource(source)}</code>
			</pre>
		</section>
	)
}

function PagePagination({ links, t }) {
	return (
		<nav aria-label="Page pagination" className="page-pagination">
			{links.previous ? (
				<a
					aria-label={`${t.previous}: ${links.previous.label}`}
					href={links.previous.hash}
				>
					<ArrowLeft aria-hidden="true" size={19} />
					<span>
						<small>{t.previous}</small>
						<strong>{links.previous.label}</strong>
					</span>
				</a>
			) : (
				<span />
			)}
			{links.next ? (
				<a
					aria-label={`${t.next}: ${links.next.label}`}
					className="next"
					href={links.next.hash}
				>
					<span>
						<small>{t.next}</small>
						<strong>{links.next.label}</strong>
					</span>
					<ArrowRight aria-hidden="true" size={19} />
				</a>
			) : (
				<span />
			)}
		</nav>
	)
}

function highlightSource(source) {
	const nodes = []
	let cursor = 0

	for (const match of source.matchAll(syntaxPattern)) {
		if (match.index > cursor) {
			nodes.push(source.slice(cursor, match.index))
		}
		const token = match[0]
		const className = syntaxClass(token)
		nodes.push(
			<span className={className} key={`${match.index}:${token}`}>
				{token}
			</span>,
		)
		cursor = match.index + token.length
	}

	if (cursor < source.length) {
		nodes.push(source.slice(cursor))
	}

	return nodes
}

function syntaxClass(token) {
	if (/^["'`]/.test(token)) {
		return "syntax-string"
	}
	if (token.startsWith("//")) {
		return "syntax-comment"
	}
	if (/^\d/.test(token)) {
		return "syntax-number"
	}
	if (/^[A-Za-z]/.test(token)) {
		return "syntax-keyword"
	}
	return undefined
}

function scrollToSection(sectionId, { behavior } = {}) {
	const section = document.getElementById(sectionId)
	if (!section) {
		return false
	}

	section.scrollIntoView({
		behavior:
			behavior ??
			(window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth"),
		block: "start",
	})
	return true
}

function useRoute() {
	const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
	return useMemo(
		() => resolveRoute(hash, { savedLocale: readSavedLocale() }),
		[hash],
	)
}

function useActiveSection(links) {
	const [activeSectionId, setActiveSectionId] = useState(links[0]?.id)

	useEffect(() => {
		setActiveSectionId(links[0]?.id)
		if (links.length === 0) {
			return undefined
		}

		let cancelled = false
		let frameId
		const updateActiveSection = () => {
			const elements = links
				.map((link) => document.getElementById(link.id))
				.filter(Boolean)
			if (elements.length === 0) {
				return
			}

			const activationLine = Math.min(window.innerHeight * 0.25, 180)
			let activeElement = elements[0]

			for (const element of elements) {
				if (element.getBoundingClientRect().top > activationLine) {
					break
				}
				activeElement = element
			}

			setActiveSectionId(activeElement.id)
		}
		const scheduleUpdate = () => {
			if (cancelled || frameId !== undefined) {
				return
			}
			frameId = window.requestAnimationFrame(() => {
				frameId = undefined
				updateActiveSection()
			})
		}

		updateActiveSection()
		document.fonts?.ready.then(scheduleUpdate)
		window.addEventListener("resize", scheduleUpdate)
		window.addEventListener("scroll", scheduleUpdate, { passive: true })
		const resizeObserver =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(scheduleUpdate)
		const main = document.querySelector(".docs-main")
		if (main) {
			resizeObserver?.observe(main)
		}

		return () => {
			cancelled = true
			if (frameId !== undefined) {
				window.cancelAnimationFrame(frameId)
			}
			resizeObserver?.disconnect()
			window.removeEventListener("resize", scheduleUpdate)
			window.removeEventListener("scroll", scheduleUpdate)
		}
	}, [links])

	return activeSectionId
}

function subscribeToHash(callback) {
	window.addEventListener("hashchange", callback)
	return () => window.removeEventListener("hashchange", callback)
}

function readHash() {
	return window.location.hash
}
