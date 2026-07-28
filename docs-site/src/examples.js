import basicFormSource from "../../examples/basic-form.tsx?raw"
import formKitSource from "../../examples/form-kit.tsx?raw"
import serverActionSource from "../../examples/server-action.ts?raw"

import { exampleFiles } from "./content.js"

export const examples = {
	"form-kit": {
		...exampleFiles["form-kit"],
		source: formKitSource,
	},
	"basic-form": {
		...exampleFiles["basic-form"],
		source: basicFormSource,
	},
	"server-action": {
		...exampleFiles["server-action"],
		source: serverActionSource,
	},
}
