import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { NodeImportDirectoryWalker } from './node-import-directory-walker.js';

const created: string[] = [];

async function tempDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-walk-'));
	created.push(directory);
	return directory;
}

afterEach(async () => {
	for (const directory of created.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('NodeImportDirectoryWalker', () => {
	it('recurses into directories with deterministic root-relative paths and byte sizes', async () => {
		const root = await tempDirectory();
		await mkdir(join(root, 'sermons'));
		await mkdir(join(root, 'books'));
		await writeFile(join(root, 'sermons', 'z.nd.json'), '{}');
		await writeFile(join(root, 'books', 'a.nd.json'), '{"blocks":[]}');
		await writeFile(join(root, 'notes.txt'), 'notes');
		const files = await new NodeImportDirectoryWalker().walk(root);
		expect(files).toEqual([
			{ sourcePath: join(root, 'books', 'a.nd.json'), relativePath: 'books/a.nd.json', size: 13 },
			{ sourcePath: join(root, 'notes.txt'), relativePath: 'notes.txt', size: 5 },
			{ sourcePath: join(root, 'sermons', 'z.nd.json'), relativePath: 'sermons/z.nd.json', size: 2 }
		]);
	});

	it('does not follow symlinks or inspect hidden staging directories', async () => {
		const root = await tempDirectory();
		const other = await tempDirectory();
		await writeFile(join(other, 'outside.nd.json'), '{}');
		await writeFile(join(root, 'inside.nd.json'), '{}');
		await mkdir(join(root, '.staging'));
		await writeFile(join(root, '.staging', 'stale.nd.json'), '{}');
		await symlink(other, join(root, 'linked-directory'));
		await symlink(join(other, 'outside.nd.json'), join(root, 'linked-file.nd.json'));
		expect((await new NodeImportDirectoryWalker().walk(root)).map(file => file.relativePath))
			.toEqual(['inside.nd.json']);
	});

	it('rejects roots that are files or symbolic links', async () => {
		const root = await tempDirectory();
		const file = join(root, 'file.nd.json');
		await writeFile(file, '{}');
		await symlink(root, join(root, 'linked-root'));
		const walker = new NodeImportDirectoryWalker();
		await expect(walker.walk(resolve(file))).rejects.toThrow('not a directory');
		await expect(walker.walk(join(root, 'linked-root'))).rejects.toThrow('not a directory');
	});
});
