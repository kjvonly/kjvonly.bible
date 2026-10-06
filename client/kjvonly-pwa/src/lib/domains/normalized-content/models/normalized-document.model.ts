import type {
	NormalizedBlock
} from './normalized-block.model';

export interface NormalizedDocument {
	source?: string;
	blocks: NormalizedBlock[];
}
