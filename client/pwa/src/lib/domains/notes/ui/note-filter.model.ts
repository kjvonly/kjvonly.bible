export type NoteFilterIndex =
	| 'title'
	| 'text'
	| 'tags[]:tag';

export interface NoteFilterParameter {
	option: string;
	index: NoteFilterIndex;
	checked: boolean;
}
