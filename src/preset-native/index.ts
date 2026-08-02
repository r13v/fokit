"use client"

import { createDefaultSlots } from "../default-slots/default-slots.js"
import { createNativeControls } from "../native-controls/native-controls.js"
import { createFormKit } from "../react/create-form-kit.js"

export const nativeFormKit = /* @__PURE__ */ createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
