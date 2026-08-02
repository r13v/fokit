"use client"

import { createFormKit } from "../react/create-form-kit.js"
import { createMuiControls } from "./controls.js"
import { createMuiSlots } from "./slots.js"
import type { CreateMuiFormKitOptions, MuiFormKitI18n } from "./types.js"

const defaultI18n = /* @__PURE__ */ Object.freeze({
	addItem: "Add item",
	removeItem: (position) => `Remove item ${position}`,
	moveItemUp: (position) => `Move item ${position} up`,
	moveItemDown: (position) => `Move item ${position} down`,
	chooseFile: "Choose file",
} satisfies MuiFormKitI18n)

const muiGrid = /* @__PURE__ */ Object.freeze([
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const)

export function createMuiFormKit(options?: CreateMuiFormKitOptions) {
	const i18n = Object.freeze({
		addItem: options?.i18n?.addItem ?? defaultI18n.addItem,
		removeItem: options?.i18n?.removeItem ?? defaultI18n.removeItem,
		moveItemUp: options?.i18n?.moveItemUp ?? defaultI18n.moveItemUp,
		moveItemDown: options?.i18n?.moveItemDown ?? defaultI18n.moveItemDown,
		chooseFile: options?.i18n?.chooseFile ?? defaultI18n.chooseFile,
	})

	return createFormKit({
		controls: createMuiControls(i18n),
		grid: muiGrid,
		slots: createMuiSlots(i18n),
	})
}

export type {
	CreateMuiFormKitOptions,
	MuiArraySlotOptions,
	MuiAutocompleteMultipleOptions,
	MuiAutocompleteOptions,
	MuiAutocompleteTextFieldProps,
	MuiCheckboxOptions,
	MuiFieldSlotOptions,
	MuiFileOptions,
	MuiFormKitI18n,
	MuiRadioChoice,
	MuiRadioOptions,
	MuiRangeSliderOptions,
	MuiSectionSlotOptions,
	MuiSelectChoice,
	MuiSelectMultipleOptions,
	MuiSelectOptions,
	MuiSliderOptions,
	MuiSwitchOptions,
	MuiTextFieldOptions,
} from "./types.js"
