/**
 * One domain-owned action rendered by a shared KJV menu view.
 *
 * The value is intentionally opaque to the shared presentation layer. The
 * owning navigation view interprets it after selection.
 */
export interface KJVMenuAction<TAction extends string = string> {
	label: string;
	value: TAction;
	disabled?: boolean;
}
