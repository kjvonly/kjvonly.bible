import type { NormalizedBlock, NormalizedDocument } from '@kjvonly/normalized-content';
import type { ParseDiagnostics } from '../diagnostics/parse-diagnostics.js';

/** Count canonical output and authored legacy IDs without storing migration metadata. */
export function getLegacyMigrationDiagnostics(
    original: unknown,
    document: NormalizedDocument
): ParseDiagnostics {
    let blocksProduced = 0;
    let wordsProduced = 0;
    let linkedWordsProduced = 0;

    function visitBlock(block: NormalizedBlock): void {
        blocksProduced++;
        if ('content' in block) {
            for (const unit of block.content) {
                if (unit.type !== 'word') continue;
                wordsProduced++;
                if (unit.href?.length) linkedWordsProduced++;
            }
        }
        if ('blocks' in block) {
            for (const child of block.blocks) visitBlock(child);
        }
    }
    for (const block of document.blocks) visitBlock(block);

    // The validated converter preserves non-null authored block IDs and
    // generates IDs for every remaining block, including nested blocks.
    function countAuthoredIds(value: unknown): number {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
        const record = value as Record<string, unknown>;
        const children = Array.isArray(record.blocks) ? record.blocks : [];
        return (typeof record.id === 'string' ? 1 : 0) +
            children.reduce<number>((sum, child) => sum + countAuthoredIds(child), 0);
    }
    const sourceIdsPreserved = countAuthoredIds(original);
    return {
        blocksProduced,
        wordsProduced,
        linkedWordsProduced,
        sourceIdsPreserved,
        idsGenerated: blocksProduced - sourceIdsPreserved,
        warnings: []
    };
}
