# Учебник: форма профиля на Fokit

Этот учебник занимает около 15 минут. В нем собирается форма профиля со
схемой, готовыми `nativeControls`, слотами по умолчанию, сгенерированными
полями, валидацией, классической отправкой React, условным UI, массивами,
ручными подписками, серверным разбором FormData, React 19 Actions и
опциональным CSS для раскладки. Там, где нужен дизайн-системный виджет или
своя разметка, tutorial показывает, как заменить отдельный control или slot.

Публичный English tutorial опубликован как Vocs route:
`https://r13v.github.io/fokit/guides/tutorial`. Полные проверяемые примеры
теперь лежат в canonical snippets:

- `docs-site/src/snippets/form-kit.tsx`
- `docs-site/src/snippets/basic-form.tsx`
- `docs-site/src/snippets/server-action.ts`

## 1. Установка

```sh
npm install fokit zod
npm install react react-dom
```

## 2. Опишите схему

Fokit берет input и output типы из Standard Schema. Zod подходит, потому что
реализует этот контракт.

```ts
export const profileSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		kind: z.enum(["person", "company"]),
		companyName: z.string().optional(),
		country: z.string().min(2, "Choose a country"),
		newsletter: z.boolean(),
		contacts: z.array(
			z.object({
				email: z.string().email("Use a valid email"),
				label: z.string().optional(),
			}),
		),
	})
	.transform((input) => ({
		...input,
		contactCount: input.contacts.length,
	}))
```

`FormInput<typeof profileSchema>` - редактируемая форма в сторе. Submit
handler получает преобразованный output с `contactCount`.

## 3. Начните с nativeControls

Для первой формы не нужно писать wrappers вокруг обычных HTML controls:

```tsx
import { createFormKit, nativeControls } from "fokit"

export const kit = createFormKit({
	controls: nativeControls,
})
```

`nativeControls` - явный registry. Fokit не подбирает controls по Zod-схеме и
не добавляет их автоматически к вашему registry, потому что control задает тип
значения и FormData contract.

Доступные controls:

- `text`: `string | undefined`, options `type`, `placeholder`,
  `autoComplete`;
- `textarea`: `string | undefined`, options `placeholder`, `autoComplete`,
  `rows`;
- `select`: `string`, options `{ options: [{ value, label, disabled? }] }`;
- `checkbox`: `boolean`;
- `number`: `number | undefined`, options `min`, `max`, `step`,
  `placeholder`;
- `date`: `string | undefined`, options `min`, `max`;
- `file`: `File | undefined`, option `accept`.

Если нужен свой дизайн-системный control, он остается обычным
React-компонентом. Fokit передает типизированное значение, metadata,
ARIA-связи и политику FormData.

```tsx
export const textControl = defineControl<string | undefined, TextOptions>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	}) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				placeholder={options.placeholder}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize: (value, { name }) =>
			value === undefined ? [] : [{ name, value }],
	},
})
```

Сохраняйте `input.id`, `input.name`, `input.ref` и
`input["aria-describedby"]`. Ставьте `aria-invalid` из `meta.invalid`,
вызывайте `blur` на blur нативного элемента, `setValue` при изменениях и
передавайте `disabled`, `readOnly`, `required` в подходящий DOM element.

Используйте `disabled`, когда control или вся форма недоступны: нативный
control не фокусируется, а при `disabled` на уровне формы submit останавливается
до validation. Используйте `readOnly`, когда значение нужно оставить доступным
для просмотра, фокуса и отправки, но запретить его изменение.

## 4. Используйте default slots или замените нужные

`slots` в `createFormKit` теперь optional и partial. Если вы не передали slot,
Fokit использует English default slots: доступную semantic HTML-разметку без
темы, CSS, цветов, шрифтов или borders.

Для русских подписей array actions используйте `createDefaultSlots({ i18n })`.
Каждое сообщение может быть строкой или функцией:

```tsx
import { createDefaultSlots } from "fokit"

const russianSlots = createDefaultSlots({
	i18n: {
		arrayAdd: "Добавить",
		arrayRemove: ({ position }) => `Удалить контакт ${position}`,
		arrayMoveUp: ({ position }) => `Поднять контакт ${position}`,
		arrayMoveDown: ({ position }) => `Опустить контакт ${position}`,
	},
})
```

`arrayAdd` получает `{ label }`. `arrayRemove`, `arrayMoveUp` и
`arrayMoveDown` получают `{ index, position }`, где `index` начинается с 0, а
`position` - с 1. Если указать только часть ключей, остальные останутся
English defaults.

Заменяйте только те slots, которые нужны дизайну. Custom slot переносит props
Fokit в вашу разметку и классы:

```tsx
function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{control}
			{errors}
		</div>
	)
}
```

Полный набор слотов в `docs-site/src/snippets/form-kit.tsx` сохраняет root
props, labels, descriptions, errors, кнопки add/remove/move для массивов и
layout props.

## 5. Соберите kit и definition

```ts
import { createDefaultSlots, createFormKit, nativeControls } from "fokit"

const slots = createDefaultSlots({
	i18n: {
		arrayAdd: "Добавить контакт",
		arrayRemove: ({ position }) => `Удалить контакт ${position}`,
		arrayMoveUp: ({ position }) => `Поднять контакт ${position}`,
		arrayMoveDown: ({ position }) => `Опустить контакт ${position}`,
	},
})

export const kit = createFormKit({
	controls: nativeControls,
	slots,
})
```

Если добавляете свой control, compose registry явно:

```ts
export const kit = createFormKit({
	controls: {
		...nativeControls,
		money: moneyControl,
	},
	slots: {
		...slots,
		Field: FieldSlot,
	},
})
```

Definition связывает пути схемы с контролами:

```ts
export const profileDefinition = kit
	.defineForm(profileSchema)
	.withContext<ProfileContext>((computed) => ({
		ui: [
			{
				kind: "field",
				path: "name",
				control: "text",
				label: "Name",
				required: true,
			},
			{
				kind: "field",
				path: "companyName",
				control: "text",
				label: "Company name",
				visible: computed(["kind"], ({ kind }) => kind === "company"),
				valuePolicy: "unset",
			},
		],
	}))
```

`computed` здесь не импортируется: `defineForm` передает в callback функцию,
уже привязанную к input схемы и `ProfileContext`. Поэтому редактор дополняет
пути зависимостей, а типы аргументов resolver выводятся без generic-параметров
и `as const`.

`valuePolicy: "unset"` разрешен только для optional путей. Когда поле
становится невидимым, Fokit удаляет значение через тот же механизм
транзакций, что и пользовательские изменения.

## 6. Dynamic options - это computed options

Положите computed value в `options` и
читайте runtime context.

```ts
options: computed(
	["kind"],
	(_values, { context }) => ({ options: context.countries }),
)
```

Замена context пересчитывает UI и не делает форму dirty. Если новый UI
запускает `valuePolicy: "unset"`, Fokit коммитит это изменение отдельно.

## 7. Отрендерите AutoForm

`kit.AutoForm` создает стор формы, рендерит все поля, по умолчанию валидирует
на submit и вызывает `onSubmit` с типизированным output.

```tsx
<kit.AutoForm
	definition={profileDefinition}
	defaultValues={defaultValues}
	context={context}
	validation={{ mode: "blur", revalidateMode: "change" }}
	onSubmit={({ value, formData }) => {
		void value.contactCount
		void formData
	}}
>
	<kit.Submit>Save profile</kit.Submit>
</kit.AutoForm>
```

Это основной путь для сгенерированных форм.

## 8. Собирайте форму вручную, когда нужно

Ручная композиция использует тот же instance:

```tsx
const form = useForm(profileDefinition, {
	defaultValues,
	context,
	onSubmit({ value }) {
		void value.contactCount
	},
})

return (
	<kit.Form form={form}>
		<kit.Fields />
		<ProfileStatus form={form} />
		<kit.Submit>Save profile</kit.Submit>
	</kit.Form>
)
```

Для точечных подписок используйте `useValue`, `useField`, `useArrayField` и
`useFormState`. Array binding отдает стабильные row keys, поэтому строки
сохраняют identity при append, insert, remove и move.

## 9. Используйте транзакции явно

`beforeUpdate` видит всю предложенную транзакцию. Верните `false`, чтобы
отменить ее; верните replacement changes, чтобы заменить; верните
`undefined`, чтобы принять. `onUpdate` срабатывает один раз после commit.

```ts
beforeUpdate(event) {
	let changed = false
	const replacement = event.changes.map((change) => {
		if (
			change.type !== "set" ||
			change.path !== "name" ||
			typeof change.value !== "string"
		) {
			return change
		}

		const value = change.value.trimStart()
		changed ||= value !== change.value
		return { ...change, value }
	})

	return changed ? replacement : undefined
}
```

Value-policy changes, команды массивов, reset и ручные команды проходят через
один детерминированный pipeline.

## 10. Разбирайте FormData на сервере

Передавайте нативную `FormData` в `parseFormData`. Он отклоняет небезопасные
пути и зарезервированные metadata до валидации схемой.

```ts
const result = await parseFormData(formData, profileActionSchema)

if (!result.success) {
	return result.reply()
}

return { status: "success", reset: "submitted" }
```

Fokit использует dot paths и array markers с именем `__fokit.array`. Не
разбирайте отправку через `Object.fromEntries`: repeated values и array markers
несут структуру.

`nativeControls` следуют browser FormData semantics:

- visible `number` и `date` отправляют строки, schema должна их coercion-ить;
- empty optional text-like field в visible DOM отправляет `""`, а preserved
  hidden/disabled `undefined` не создает hidden entry;
- checked checkbox отправляет `"true"`, unchecked visible checkbox отсутствует
  в `FormData`;
- hidden/disabled preserved checkbox сериализуется как `"true"` или `"false"`;
- file control отправляет настоящий `File`, но browser не разрешает prefill
  файла, поэтому начальное значение должно быть `undefined`; hidden/disabled
  preserved file не имеет hidden serializer.

## 11. React 19 Actions отдельно

React 19 Actions изолированы:

```tsx
import { ActionForm, ActionSubmit } from "fokit/react19"

<ActionForm
	action={saveProfileAction}
	defaultValues={defaultValues}
	definition={profileDefinition}
	kit={kit}
	result={state}
>
	<ActionSubmit>Save profile</ActionSubmit>
</ActionForm>
```

Action forms работают server-first. Fokit не запускает client validation перед
dispatch. Server Action возвращает serializable `FormResult`, а hydrated form
применяет ошибки или reset-инструкции.

`ActionForm` бросает ошибку до dispatch, если активное значение нельзя
представить в FormData: активен control с `mode: "none"` или скрытый/disabled
native control не имеет serializer.

## 12. Добавьте layout только при необходимости

```ts
import "fokit/layout.css"
```

Stylesheet использует `@layer fokit`, `:where(...)`, container queries и четыре
spacing variables. Он не задает цвета, шрифты, borders, focus rings или внешний
вид контролов.

## 13. Проверяйте примеры

Репозиторий typecheck-ит copyable examples командой:

```sh
npm run test:docs
```

Перед завершением документационных изменений запускайте `npm run check` и
`npm run knip`.

## Граница продукта

Fokit отвечает за типизированную инфраструктуру форм, а schema-to-UI inference,
visual builder, remote JSON definitions, темы, middleware chains, wizards,
autosave, async option loading, devtools и React Native поддержку оставляет
коду приложения.
