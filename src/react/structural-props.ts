import type { GridSpan } from "../core/index.js"
import type { StructuralNodeName, StructuralRootProps } from "./slots.js"

type StructuralDataProps = {
	readonly "aria-describedby"?: string
	readonly "aria-labelledby"?: string
	readonly "data-fokit-path"?: string
	readonly "data-fokit-span"?: string
	readonly "data-invalid"?: ""
	readonly "data-dirty"?: ""
	readonly "data-disabled"?: ""
	readonly "data-readonly"?: ""
	readonly "data-required"?: ""
	readonly "data-touched"?: ""
	readonly "data-validating"?: ""
}

type GeneratedRootProps = StructuralRootProps & StructuralDataProps

export function createErrorMessageRootProps({
	id,
	path,
	tabIndex,
	ref,
}: {
	readonly id: string
	readonly path?: string
	readonly tabIndex?: -1
	readonly ref?: (element: HTMLElement | null) => void
}): StructuralRootProps {
	const props: GeneratedRootProps = {
		"data-fokit-node": "error-message",
		...(path === undefined ? {} : { "data-fokit-path": path }),
		id,
		...(tabIndex === undefined ? {} : { tabIndex }),
		...(ref === undefined ? {} : { ref }),
	}

	return props
}

export function createStructuralRootProps(
	nodeName: StructuralNodeName,
	options: {
		readonly id?: string
		readonly path?: string
		readonly className?: string
		readonly span?: GridSpan
		readonly invalid?: boolean
		readonly dirty?: boolean
		readonly disabled?: boolean
		readonly readOnly?: boolean
		readonly required?: boolean
		readonly touched?: boolean
		readonly validating?: boolean
		readonly labelledBy?: string
		readonly describedBy?: string
	},
): StructuralRootProps {
	const props: GeneratedRootProps = {
		"data-fokit-node": nodeName,
		...(options.id === undefined ? {} : { id: options.id }),
		...(options.path === undefined ? {} : { "data-fokit-path": options.path }),
		...(options.span === undefined
			? {}
			: { "data-fokit-span": String(options.span) }),
		...(options.className === undefined
			? {}
			: { className: options.className }),
		...(options.labelledBy === undefined
			? {}
			: { "aria-labelledby": options.labelledBy }),
		...(options.describedBy === undefined
			? {}
			: { "aria-describedby": options.describedBy }),
		"data-invalid": booleanData(options.invalid === true),
		"data-dirty": booleanData(options.dirty === true),
		"data-disabled": booleanData(options.disabled === true),
		"data-readonly": booleanData(options.readOnly === true),
		"data-required": booleanData(options.required === true),
		"data-touched": booleanData(options.touched === true),
		"data-validating": booleanData(options.validating === true),
	}

	return props
}

export function joinIds(
	ids: readonly (string | undefined)[],
): string | undefined {
	const joined = ids.filter((id) => id !== undefined && id.length > 0).join(" ")
	return joined.length === 0 ? undefined : joined
}

export function booleanData(value: boolean): "" | undefined {
	return value ? "" : undefined
}
