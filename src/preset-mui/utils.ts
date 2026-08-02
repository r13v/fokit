import type { SxProps, Theme } from "@mui/material/styles"

export function mergeSx(
	...values: readonly (SxProps<Theme> | undefined)[]
): SxProps<Theme> {
	return values
		.flatMap((value) => (Array.isArray(value) ? value : [value]))
		.filter((value) => value !== undefined) as SxProps<Theme>
}
