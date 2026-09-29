import { describe, expect, it } from 'vitest';

import { PetNameService } from './pet-name.service';

class MemoryStorage {
	private readonly values = new Map<string, string>();

	getItem(key: string): string | null {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value);
	}
}

describe('PetNameService', () => {
	it('uses configured defaults for known identities', () => {
		const service = new PetNameService(
			new MemoryStorage(),
			{
				'kjvonly-pubkey': 'KJVOnly'
			}
		);

		expect(service.resolve('kjvonly-pubkey')).toBe('KJVOnly');
	});

	it('falls back to a compact identity', () => {
		const service = new PetNameService(new MemoryStorage());
		const identity = '0123456789abcdef0123456789abcdef';

		expect(service.resolve(identity)).toBe('01234567…89abcdef');
	});

	it('persists user-local pet names', () => {
		const storage = new MemoryStorage();
		const first = new PetNameService(storage);

		first.set('friend-pubkey', 'Fred');

		const second = new PetNameService(storage);

		expect(second.resolve('friend-pubkey')).toBe('Fred');
	});

	it('lets a saved pet name override a configured default', () => {
		const storage = new MemoryStorage();
		new PetNameService(storage).set('publisher', 'My Publisher');

		const service = new PetNameService(storage, {
			publisher: 'Default Publisher'
		});

		expect(service.resolve('publisher')).toBe('My Publisher');
	});
});
