/** One caller-owned action rendered by the expandable presentation. */
export interface KJVExpandableActionClusterItem {
	readonly id: string;
	readonly label: string;
	readonly onSelect: () => void;
	readonly pressed?: boolean;
}
