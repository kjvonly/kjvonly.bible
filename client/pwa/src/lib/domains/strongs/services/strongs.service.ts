import type { PublishedResourceReference } from '$lib/resource';
import { parseDictionaryResourceId, type DictionaryService } from '$lib/domains/dictionary';
import type { Strongs } from '../models/strongs.model';
import { StrongsDefinitionDataTypeHandler } from '../resources/definitions/strongs-data-type-handler';
import { createStrongsId } from '../utils/strongs-identity';

/** Strong's owns the definition model; Dictionary owns the compressed definition lookup. */
export class StrongsService {
    private readonly validator = new StrongsDefinitionDataTypeHandler();

    constructor(private readonly dictionary: Pick<DictionaryService, 'get' | 'prepareSource'>) {}

    async get(source: PublishedResourceReference, key: string): Promise<Strongs> {
        const { edition } = parseDictionaryResourceId(source.resourceId);
        if (!edition.startsWith('strongs-')) {
            throw new Error(`Not a Strong's Dictionary edition: ${source.resourceId}`);
        }
        const status = await this.dictionary.prepareSource(source);
        if (status.status !== 'ready') throw new Error(status.error);

        const raw = await this.dictionary.get(source, key);
        const content = this.validator.validate(raw);
        if (content.number !== key) {
            throw new Error(`Strong's key ${key} does not match content number ${content.number}.`);
        }
        return {
            ...content,
            id: createStrongsId(`${source.publisher}/${edition.slice('strongs-'.length)}`, key)
        };
    }
}
