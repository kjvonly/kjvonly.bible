import type {
	NormalizedContent
} from './normalized-content.model';

export interface NormalizedBlock {
	type: string;
	id?: string | null;
	class?: string[] | null;
	level?: number;
	ordered?: boolean;
	content?: NormalizedContent[];
	blocks?: NormalizedBlock[];
}
