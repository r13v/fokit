export function rejectOwnedProps(
	props: object,
	owner: "form" | "submit",
	ownedProps: readonly string[],
): void {
	for (const prop of ownedProps) {
		if (Object.hasOwn(props, prop)) {
			throw new TypeError(`Form Please owns the ${prop} ${owner} prop`)
		}
	}
}
