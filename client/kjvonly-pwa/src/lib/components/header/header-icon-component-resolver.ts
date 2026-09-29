import Add from '../svgs/add.svelte';
import AddCircle from '../svgs/addCircle.svelte';
import AddNote from '../svgs/addNote.svelte';
import AlphaNumeric from '../svgs/alphaNumeric.svelte';
import ArrowBack from '../svgs/arrowBack.svelte';
import BookRibbon from '../svgs/bookRibbon.svelte';
import Check from '../svgs/check.svelte';
import CheckCircle from '../svgs/checkCircle.svelte';
import Copy from '../svgs/copy.svelte';
import DocumentSearch from '../svgs/documentSearch.svelte';
import Close from '../svgs/close.svelte';
import Edit from '../svgs/edit.svelte';
import EditOff from '../svgs/editOff.svelte';
import Export from '../svgs/export.svelte';
import Filter from '../svgs/filter.svelte';
import FormatListNumbered from '../svgs/formatListNumbered.svelte';
import Grid from '../svgs/grid.svelte';
import Import from '../svgs/import.svelte';
import List from '../svgs/list.svelte';
import MoreVertical from '../svgs/moreVertical.svelte';
import Pending from '../svgs/pending.svelte';
import Save from '../svgs/save.svelte';
import SplitScreenBottom from '../svgs/splitScreenBottom.svelte';
import SplitScreenRight from '../svgs/splitScreenRight.svelte';
import Tag from '../svgs/tag.svelte';

import type {
	HeaderIconID
} from './header-action.model';

///////////////////////////////////////////////////////////////////////////////

const HEADER_ICON_COMPONENTS = {
	add: Add,
	'add-circle': AddCircle,
	'add-note': AddNote,
	'alpha-numeric': AlphaNumeric,
	'arrow-back': ArrowBack,
	'book-ribbon': BookRibbon,
	check: Check,
	'check-circle': CheckCircle,
	copy: Copy,
	'document-search': DocumentSearch,
	close: Close,
	edit: Edit,
	'edit-off': EditOff,
	export: Export,
	filter: Filter,
	'format-list-numbered': FormatListNumbered,
	grid: Grid,
	import: Import,
	list: List,
	'more-vertical': MoreVertical,
	pending: Pending,
	save: Save,
	'split-horizontal': SplitScreenBottom,
	'split-vertical': SplitScreenRight,
	tag: Tag
} as const satisfies Record<HeaderIconID, unknown>;

///////////////////////////////////////////////////////////////////////////////

export function resolveHeaderIconComponent(
	iconID: HeaderIconID
) {
	return HEADER_ICON_COMPONENTS[iconID];
}
