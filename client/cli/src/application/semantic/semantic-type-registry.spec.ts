import { describe, expect, it, vi } from 'vitest';
import {
	SemanticTypeRegistry,
	type SemanticTypeDefinition
} from './semantic-type-registry.js';
import {
	createNormalizedDocumentSemanticType
} from './definitions/normalized-document-semantic-type.js';

function definition(
	version: number,
	validate: SemanticTypeDefinition['validate'] = () => {}
): SemanticTypeDefinition {
	return {
		dataType: 'kjvonly.example',
		dataVersion: version,
		resourceType: 'example/resource',
		objectType: 'example/object',
		validate
	};
}

describe('SemanticTypeRegistry', () => {
	it('rejects duplicate versions of the same data type', () => {
		expect(() => new SemanticTypeRegistry([
			definition(1),
			definition(1)
		])).toThrow('Duplicate semantic type registration: kjvonly.example v1');
	});

	it('permits different versions but rejects invalid registrations', () => {
		expect(() => new SemanticTypeRegistry([
			definition(1),
			definition(2)
		])).not.toThrow();
		expect(() => new SemanticTypeRegistry([
			definition(0)
		])).toThrow('Invalid semantic type registration.');
	});

	it('returns versions in newest-first order without leaking the internal list', () => {
		const registry = new SemanticTypeRegistry([
			definition(1), definition(3), definition(2)
		]);
		const versions = registry.versions('kjvonly.example');
		expect(versions.map(entry => entry.dataVersion)).toEqual([3, 2, 1]);
		(versions as SemanticTypeDefinition[]).pop();
		expect(registry.versions('kjvonly.example')).toHaveLength(3);
		expect(registry.versions('kjvonly.unknown')).toEqual([]);
	});

	it('validates the newest supported version before older versions', async () => {
		const older = vi.fn();
		const newer = vi.fn(async () => {});
		const newest = definition(2, newer);
		const registry = new SemanticTypeRegistry([
			definition(1, older), newest
		]);
		expect(await registry.resolve('kjvonly.example', { valid: true }))
			.toBe(newest);
		expect(newer).toHaveBeenCalledOnce();
		expect(older).not.toHaveBeenCalled();
	});

	it('falls back to an older version when newer validation rejects', async () => {
		const older = definition(1, vi.fn());
		const newest = definition(3, () => { throw new Error('invalid v3'); });
		const registry = new SemanticTypeRegistry([older, newest]);
		expect(await registry.resolve('kjvonly.example', {})).toBe(older);
	});

	it('fails rather than silently treating invalid semantic content as generic', async () => {
		const registry = new SemanticTypeRegistry([
			definition(1, () => { throw new Error('invalid v1'); }),
			definition(2, () => { throw new Error('invalid v2'); })
		]);
		await expect(registry.resolve('kjvonly.example', {}))
			.rejects.toThrow('No registered version of kjvonly.example accepts the content.');
		await expect(registry.resolve('kjvonly.unknown', {}))
			.rejects.toThrow('Unsupported semantic data type: kjvonly.unknown');
	});

	it('returns registered Resource and object metadata for accepted content', async () => {
		const definition = createNormalizedDocumentSemanticType({
			validate(value: unknown) {
				if (value !== 'document') throw new Error('invalid document');
				return value;
			}
		});
		const registry = new SemanticTypeRegistry([definition]);
		const resolved = await registry.resolve('kjvonly.normalized-document', 'document');
		expect(resolved).toMatchObject({
			dataType: 'kjvonly.normalized-document',
			dataVersion: 1,
			resourceType: 'normalized-content/document',
			objectType: 'normalized-content/document'
		});
		await expect(registry.resolve('kjvonly.normalized-document', 'not-document'))
			.rejects.toThrow('No registered version of kjvonly.normalized-document accepts the content.');
	});
});
