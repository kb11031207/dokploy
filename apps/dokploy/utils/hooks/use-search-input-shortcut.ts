import { useEffect, type RefObject } from "react";

interface UseSearchInputShortcutOptions {
	/**
	 * Whether the keyboard shortcut is enabled
	 * @default true
	 */
	enabled?: boolean;
	/**
	 * The key to trigger the shortcut (without modifier)
	 * @default "k"
	 */
	key?: string;
}

/**
 * Hook that adds a keyboard shortcut (Cmd+K / Ctrl+K) to focus a search input.
 * The shortcut will not trigger if the user is already typing in an input field,
 * textarea, select element, or contenteditable element.
 *
 * @param inputRef - React ref to the input element that should receive focus
 * @param options - Configuration options for the hook
 *
 * @example
 * ```tsx
 * const searchInputRef = useRef<HTMLInputElement>(null);
 * useSearchInputShortcut(searchInputRef);
 *
 * return <Input ref={searchInputRef} placeholder="Search..." />;
 * ```
 */
export function useSearchInputShortcut(
	inputRef: RefObject<HTMLInputElement>,
	options: UseSearchInputShortcutOptions = {},
) {
	const { enabled = true, key = "k" } = options;

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			// Check if the correct key combination is pressed
			if (e.key !== key || (!e.metaKey && !e.ctrlKey)) {
				return;
			}

			// Don't trigger if user is already typing in an input field
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					activeElement.tagName === "SELECT" ||
					activeElement.getAttribute("contenteditable") === "true")
			) {
				return;
			}

			// Prevent browser's default Cmd+K behavior (e.g., address bar focus)
			e.preventDefault();

			// Focus the search input
			inputRef.current?.focus();
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [enabled, key, inputRef]);
}

