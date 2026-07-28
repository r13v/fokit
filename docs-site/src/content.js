export const LOCALES = ["en", "ru"]
export const DEFAULT_LOCALE = "en"
export const DEFAULT_LESSON_ID = "overview"

export const LESSON_IDS = [
	"overview",
	"first-form",
	"controls-and-slots",
	"validation-and-conditions",
	"arrays",
	"manual-composition",
	"classic-submit",
	"server-form-data",
	"react19-actions",
	"styling-testing-boundaries",
]

export const exampleFiles = {
	"form-kit": {
		label: "Form kit and definition",
		path: "examples/form-kit.tsx",
	},
	"basic-form": {
		label: "Generated and manual React form",
		path: "examples/basic-form.tsx",
	},
	"server-action": {
		label: "Server FormData parser and Action result",
		path: "examples/server-action.ts",
	},
}

export const curriculum = {
	en: [
		lesson("overview", {
			title: "What Fokit gives you",
			summary:
				"Start with the shape of the library: schema-owned validation, app-owned UI, and public exports that work without hidden form dependencies.",
			sections: [
				"Fokit keeps the form store and renderer small enough to reason about while letting the application own controls and structural slots.",
				"The first pass is code-first: define the schema, connect controls, then decide how much generated rendering you want.",
			],
			links: ["first-form", "styling-testing-boundaries"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("first-form", {
			title: "Build the first profile form",
			summary:
				"Install the package, define complete default values, and render an AutoForm from the shared profile definition.",
			sections: [
				"The editable value type comes from Standard Schema input. The submitted value type comes from Standard Schema output.",
				"Complete defaults make the form deterministic: every editable field starts from a known value and reset can return to that baseline.",
			],
			links: ["overview", "controls-and-slots"],
			exampleIds: ["basic-form"],
		}),
		lesson("controls-and-slots", {
			title: "Own controls and slots",
			summary:
				"Use defineControl and createFormKit to keep product markup, accessibility, and FormData behavior in application code.",
			sections: [
				"Controls receive value, setters, metadata, disabled/read-only state, native input props, and resolved options.",
				"The five slots are Field, Section, Array, ArrayItem, and ErrorMessage. Each slot preserves the root props Fokit gives it.",
			],
			links: ["first-form", "validation-and-conditions"],
			exampleIds: ["form-kit"],
		}),
		lesson("validation-and-conditions", {
			title: "Validation and conditional UI",
			summary:
				"Connect blur/change validation, computed UI state, context-backed options, and visibility value policies.",
			sections: [
				"Computed values declare the paths they depend on, so unrelated edits can reuse resolved UI state.",
				"When a hidden optional field uses valuePolicy unset, Fokit removes its value through the same transaction pipeline as user edits.",
			],
			links: ["controls-and-slots", "arrays"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("arrays", {
			title: "Arrays with stable row identity",
			summary:
				"Render generated array fields, append rows from itemDefault, and keep row keys stable across insert, remove, and move.",
			sections: [
				"Array commands update values and field metadata atomically, so dirty, touched, and exposed issue state follows the row.",
				"Array slots receive guarded add, remove, and move commands and can disable actions when the UI state requires it.",
			],
			links: ["validation-and-conditions", "manual-composition"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("manual-composition", {
			title: "Compose manually where needed",
			summary:
				"Use the same form instance with useValue, useField, useArrayField, and useFormState for bespoke product flows.",
			sections: [
				"Granular hooks subscribe to selected paths or derived state, so unrelated field changes do not rerender the whole form.",
				"Manual controls and generated fields can share one form instance when a product screen needs extra commands or summaries.",
			],
			links: ["arrays", "classic-submit"],
			exampleIds: ["basic-form"],
		}),
		lesson("classic-submit", {
			title: "Classic React submission",
			summary:
				"Handle native submit in React 18-compatible forms with validation, pending state, reset, and focus management.",
			sections: [
				"Classic submit captures FormData synchronously, validates the captured snapshot, and keeps pending state tied to that attempt.",
				"Reset uses the form store rather than native DOM rollback after hydration, preserving controlled inputs and baseline semantics.",
			],
			links: ["manual-composition", "server-form-data"],
			exampleIds: ["basic-form"],
		}),
		lesson("server-form-data", {
			title: "Safe server FormData",
			summary:
				"Parse native FormData into null-prototype objects, bounded arrays, and serializable issues before schema validation.",
			sections: [
				"The server parser rejects structural collisions, prototype keys, sparse indexes, unknown reserved metadata, and oversized payloads.",
				"Returned issues use the same transport contract that React 19 Actions and classic server replies can apply to a form.",
			],
			links: ["classic-submit", "react19-actions"],
			exampleIds: ["server-action"],
		}),
		lesson("react19-actions", {
			title: "React 19 Actions",
			summary:
				"Keep the Action on the native form while Fokit coordinates server-first submit results and client validation state.",
			sections: [
				"The React 19 adapter is isolated in fokit/react19 so the main package remains usable from React 18 projects.",
				"Action results can install server issues, retain success, reset to submitted values, or reset to defaults.",
			],
			links: ["server-form-data", "styling-testing-boundaries"],
			exampleIds: ["server-action"],
		}),
		lesson("styling-testing-boundaries", {
			title: "Styling and testing boundaries",
			summary:
				"Import optional structural CSS only when you want Fokit's layout layer, then verify the package and docs from built exports.",
			sections: [
				"The stylesheet owns responsive structure, gaps, spans, and data attributes. It does not theme colors, typography, or controls.",
				"Release checks build the package, test public declarations, pack the tarball, smoke consumer fixtures, and compile every full example.",
			],
			links: ["overview", "react19-actions"],
			exampleIds: ["form-kit", "basic-form", "server-action"],
		}),
	],
	ru: [
		lesson("overview", {
			title: "Что дает Fokit",
			summary:
				"Начните с устройства библиотеки: валидация принадлежит схеме, UI принадлежит приложению, а публичные экспорты работают без скрытых form-зависимостей.",
			sections: [
				"Fokit держит стор формы и рендерер достаточно маленькими, чтобы их можно было проверять, но оставляет контролы и структурные слоты приложению.",
				"Первый путь code-first: опишите схему, подключите контролы и выберите, сколько сгенерированного рендера нужно экрану.",
			],
			links: ["first-form", "styling-testing-boundaries"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("first-form", {
			title: "Соберите первую форму профиля",
			summary:
				"Установите пакет, задайте полные default values и отрендерите AutoForm из общей profile definition.",
			sections: [
				"Редактируемый тип значения приходит из Standard Schema input. Тип отправки приходит из Standard Schema output.",
				"Полные defaults делают форму детерминированной: каждое редактируемое поле стартует из известного значения, а reset возвращает к этому baseline.",
			],
			links: ["overview", "controls-and-slots"],
			exampleIds: ["basic-form"],
		}),
		lesson("controls-and-slots", {
			title: "Владейте контролами и слотами",
			summary:
				"Используйте defineControl и createFormKit, чтобы продуктовая разметка, accessibility и FormData-поведение оставались в коде приложения.",
			sections: [
				"Контролы получают value, setters, metadata, disabled/read-only state, native input props и resolved options.",
				"Пять слотов: Field, Section, Array, ArrayItem и ErrorMessage. Каждый слот сохраняет root props, которые передает Fokit.",
			],
			links: ["first-form", "validation-and-conditions"],
			exampleIds: ["form-kit"],
		}),
		lesson("validation-and-conditions", {
			title: "Валидация и условный UI",
			summary:
				"Подключите blur/change validation, computed UI state, options из context и visibility value policies.",
			sections: [
				"Computed values объявляют зависимые пути, поэтому unrelated edits могут переиспользовать resolved UI state.",
				"Когда скрытое optional поле использует valuePolicy unset, Fokit удаляет значение через тот же transaction pipeline, что и пользовательские edits.",
			],
			links: ["controls-and-slots", "arrays"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("arrays", {
			title: "Массивы со стабильными строками",
			summary:
				"Рендерьте generated array fields, добавляйте строки из itemDefault и сохраняйте stable row keys при insert, remove и move.",
			sections: [
				"Array commands атомарно обновляют values и field metadata, поэтому dirty, touched и exposed issue state следуют за строкой.",
				"Array slots получают защищенные add, remove и move commands и могут отключать действия, когда этого требует UI state.",
			],
			links: ["validation-and-conditions", "manual-composition"],
			exampleIds: ["form-kit", "basic-form"],
		}),
		lesson("manual-composition", {
			title: "Собирайте вручную, где нужно",
			summary:
				"Используйте тот же form instance с useValue, useField, useArrayField и useFormState для кастомных продуктовых сценариев.",
			sections: [
				"Гранулярные hooks подписываются на выбранные пути или derived state, поэтому изменение одного поля не ререндерит всю форму.",
				"Manual controls и generated fields могут делить один form instance, когда экрану нужны дополнительные команды или summaries.",
			],
			links: ["arrays", "classic-submit"],
			exampleIds: ["basic-form"],
		}),
		lesson("classic-submit", {
			title: "Классическая отправка React",
			summary:
				"Обрабатывайте native submit в React 18-compatible формах с validation, pending state, reset и focus management.",
			sections: [
				"Classic submit синхронно захватывает FormData, валидирует captured snapshot и привязывает pending state к этой attempt.",
				"Reset после hydration использует form store, а не native DOM rollback, сохраняя controlled inputs и baseline semantics.",
			],
			links: ["manual-composition", "server-form-data"],
			exampleIds: ["basic-form"],
		}),
		lesson("server-form-data", {
			title: "Безопасный серверный FormData",
			summary:
				"Разбирайте native FormData в null-prototype objects, bounded arrays и serializable issues до schema validation.",
			sections: [
				"Server parser отклоняет structural collisions, prototype keys, sparse indexes, unknown reserved metadata и oversized payloads.",
				"Returned issues используют тот же transport contract, который React 19 Actions и classic server replies могут применить к форме.",
			],
			links: ["classic-submit", "react19-actions"],
			exampleIds: ["server-action"],
		}),
		lesson("react19-actions", {
			title: "React 19 Actions",
			summary:
				"Оставьте Action на native form, пока Fokit связывает server-first submit results и client validation state.",
			sections: [
				"React 19 adapter изолирован в fokit/react19, поэтому main package остается пригодным для React 18 проектов.",
				"Action results могут установить server issues, сохранить success, reset к submitted values или reset к defaults.",
			],
			links: ["server-form-data", "styling-testing-boundaries"],
			exampleIds: ["server-action"],
		}),
		lesson("styling-testing-boundaries", {
			title: "Границы стилей и тестов",
			summary:
				"Импортируйте optional structural CSS только когда нужен layout layer Fokit, затем проверяйте пакет и docs из built exports.",
			sections: [
				"Stylesheet отвечает за responsive structure, gaps, spans и data attributes. Он не задает colors, typography или control styling.",
				"Release checks собирают пакет, тестируют public declarations, пакуют tarball, smoke-test consumer fixtures и компилируют каждый full example.",
			],
			links: ["overview", "react19-actions"],
			exampleIds: ["form-kit", "basic-form", "server-action"],
		}),
	],
}

export function getLesson(locale, lessonId) {
	const lessons = curriculum[isLocale(locale) ? locale : DEFAULT_LOCALE]
	return lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0]
}

export function getAdjacentLessons(locale, lessonId) {
	const lessons = curriculum[isLocale(locale) ? locale : DEFAULT_LOCALE]
	const index = Math.max(
		0,
		lessons.findIndex((lesson) => lesson.id === lessonId),
	)

	return {
		previous: index > 0 ? lessons[index - 1] : undefined,
		next: index < lessons.length - 1 ? lessons[index + 1] : undefined,
	}
}

export function isLocale(value) {
	return LOCALES.includes(value)
}

export function isLessonId(value) {
	return LESSON_IDS.includes(value)
}

function lesson(id, { title, summary, sections, links, exampleIds }) {
	return {
		id,
		title,
		summary,
		sections,
		links: links.map((lessonId) => ({ lessonId })),
		exampleIds,
	}
}
