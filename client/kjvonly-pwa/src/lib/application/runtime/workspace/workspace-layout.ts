import {
	renderGridTemplateAreas,
	renderGridTemplateColumns
} from '$lib/application/runtime/workspace/workspace-grid';
import { alphabeticSequenceToNumber } from '$lib/shared';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

export interface WorkspacePaneDimensions {
	height: number;
	width: number;
}

export type WorkspacePaneDimensionsByID = Record<
	string,
	WorkspacePaneDimensions
>;

export interface WorkspaceLayout {
	activePaneIDs: string[];
	gridTemplateAreas: string[][];
	paneDimensionsByID: WorkspacePaneDimensionsByID;
	template: string;
}

/**
 * Derives the presentation layout for the current Pane tree.
 *
 * This is intentionally pure: it does not mutate Pane state, publish size
 * changes, or know about deleted Pane DOM retention. Those responsibilities
 * remain at the runtime/presentation boundary.
 */
export function deriveWorkspaceLayout(
	rootPane: Pane
): WorkspaceLayout {
	const gridTemplateAreas =
		renderGridTemplateAreas(
			rootPane
		);

	const activePaneIDs =
		collectActivePaneIDs(
			gridTemplateAreas
		);

	return {
		activePaneIDs,
		gridTemplateAreas,
		paneDimensionsByID:
			derivePaneDimensions(
				gridTemplateAreas,
				activePaneIDs
			),
		template:
			renderWorkspaceGridTemplate(
				gridTemplateAreas
			)
	};
}

function collectActivePaneIDs(
	gridTemplateAreas: string[][]
): string[] {
	const paneIDs = new Set<string>();

	for (const row of gridTemplateAreas) {
		for (const paneID of row) {
			paneIDs.add(
				paneID
			);
		}
	}

	return sortPaneIDs(
		[...paneIDs]
	);
}

export function sortPaneIDs(
	paneIDs: string[]
): string[] {
	return [...paneIDs].sort(
		(a, b) =>
			alphabeticSequenceToNumber(a) -
			alphabeticSequenceToNumber(b)
	);
}

function derivePaneDimensions(
	gridTemplateAreas: string[][],
	paneIDs: string[]
): WorkspacePaneDimensionsByID {
	const rowCount =
		gridTemplateAreas.length;
	const columnCount =
		gridTemplateAreas[0].length;
	const paneDimensionsByID: WorkspacePaneDimensionsByID = {};

	for (const paneID of paneIDs) {
		let occupiedRows = 0;
		let occupiedColumns = 0;

		for (const row of gridTemplateAreas) {
			const columnsInRow =
				row.filter(
					(value) =>
						value === paneID
				).length;

			if (columnsInRow === 0) {
				continue;
			}

			occupiedRows += 1;
			occupiedColumns =
				Math.max(
					occupiedColumns,
					columnsInRow
				);
		}

		paneDimensionsByID[paneID] = {
			height:
				occupiedRows /
				rowCount,
			width:
				occupiedColumns /
				columnCount
		};
	}

	return paneDimensionsByID;
}

function renderWorkspaceGridTemplate(
	gridTemplateAreas: string[][]
): string {
	const areas =
		gridTemplateAreas
			.map(
				(row) =>
					`"${row.join(' ')}"`
			)
			.join('\n');

	return `display: grid;
	max-height: 100vh;
	grid-template-columns: ${renderGridTemplateColumns(gridTemplateAreas)};

	grid-template-areas:
		${areas};`;
}
