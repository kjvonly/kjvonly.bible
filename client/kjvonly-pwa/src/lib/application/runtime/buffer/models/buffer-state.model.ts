/**
 * Persisted runtime state owned by one Buffer/module interaction.
 *
 * Module-specific state is intentionally typed by the consuming module rather
 * than centralized in the application runtime.
 */
export type BufferState =
	Record<string, unknown>;
