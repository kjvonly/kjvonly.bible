import { describe, expect, it, vi } from 'vitest';
import { StrongsService } from './strongs.service';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/strongs-kjvs' };
const content = {
    number: 'G26', originalWord: 'ἀγάπη', partsOfSpeech: 'Noun',
    phoneticSpelling: 'ag-ah-pay', transliteratedWord: 'agapē',
    usageByBook: [], usageByWord: [], brownDef: null, strongsDef: '<p>love</p>', thayersDef: null
};

describe('StrongsService raw Dictionary lookup', () => {
    it("retrieves by exact key and preserves Strong's semantic shape", async () => {
        const get = vi.fn().mockResolvedValue(content);
        const prepareSource = vi.fn().mockResolvedValue({ status: 'ready', source, edition: {} });
        const service = new StrongsService({ get, prepareSource });
        await expect(service.get(source, 'G26')).resolves.toEqual({ ...content, id: 'publisher/kjvs/G26' });
        expect(get).toHaveBeenCalledExactlyOnceWith(source, 'G26');
        expect(prepareSource).toHaveBeenCalledExactlyOnceWith(source);
    });

    it('reports installation failure instead of looking up a missing edition', async () => {
        const get = vi.fn();
        const service = new StrongsService({
            get,
            prepareSource: vi.fn().mockResolvedValue({ status: 'error', source, error: 'Not installed' })
        });
        await expect(service.get(source, 'G26')).rejects.toThrow('Not installed');
        expect(get).not.toHaveBeenCalled();
    });

    it("rejects a value whose Strong's number does not match its requested key", async () => {
        const service = new StrongsService({
            get: vi.fn().mockResolvedValue(content),
            prepareSource: vi.fn().mockResolvedValue({ status: 'ready', source })
        });
        await expect(service.get(source, 'G25')).rejects.toThrow('does not match');
    });

    it("does not treat a Webster source as a Strong's edition", async () => {
        const get = vi.fn();
        const service = new StrongsService({ get, prepareSource: vi.fn() });
        await expect(service.get({ ...source, resourceId: 'kjvonly/dictionary/entries/webster-1828' }, 'G26'))
            .rejects.toThrow('Not a Strong');
        expect(get).not.toHaveBeenCalled();
    });
});
