import { z } from "zod"

z.config({
	customError: (issue) => {
		if (issue.code === "invalid_type") {
			return "Enter a value of the correct type"
		}

		if (issue.code === "too_small" && issue.origin === "string") {
			return `Enter at least ${issue.minimum} characters`
		}

		return undefined
	},
})
