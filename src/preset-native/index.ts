"use client"

import { createFormKit } from "../create-form-kit.js"
import { createDefaultSlots } from "../default-slots/default-slots.js"
import { createNativeControls } from "../native-controls/native-controls.js"

export const nativeFormKit = /* @__PURE__ */ createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
