import type { ControlName } from "../../src/index.js"
import { nativeFormKit } from "../../src/preset-native/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type _nativePresetControlNames = Expect<
	Equal<
		ControlName<typeof nativeFormKit.controls>,
		| "text"
		| "textarea"
		| "select"
		| "checkbox"
		| "number"
		| "date"
		| "time"
		| "file"
	>
>

const extended = nativeFormKit.extend({
	controls: {
		custom: nativeFormKit.controls.text,
	},
})

type _extendedPresetControlNames = Expect<
	Equal<
		ControlName<typeof extended.controls>,
		| "custom"
		| "text"
		| "textarea"
		| "select"
		| "checkbox"
		| "number"
		| "date"
		| "time"
		| "file"
	>
>

type RootExports = typeof import("../../src/index.js")

// @ts-expect-error the native preset must stay out of the headless root entry
type _noRootNativePreset = RootExports["nativeFormKit"]

void extended
