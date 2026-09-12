import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	BibleBooknamesService
} from './bible-booknames.service';

const SOURCE:
	PublishedResourceReference = {
		publisher:
			'publisher-a',

		resourceId:
			'kjvonly/bible/booknames/default'
	};

const BOOKNAMES_ID =
	'publisher-a/default';

const BOOKNAMES:
	BibleBooknames = {
		id:
			BOOKNAMES_ID,

		booknamesById: {
			'1':
				'Genesis'
		},

		booknamesByName: {
			Genesis:
				1
		},

		shortNames: {
			'1':
				'Gen'
		},

		maxChapterById: {
			'1':
				50
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
		}
	};

describe(
	'BibleBooknamesService',
	() => {
		it(
			'returns already installed Booknames without installing the Resource',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							BOOKNAMES
						);

				const install =
					vi.fn();

				const service =
					new BibleBooknamesService(
						{ get },
						{ install }
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					BOOKNAMES
				);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					BOOKNAMES
				);

				expect(
					get
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					get
				).toHaveBeenCalledWith(
					BOOKNAMES_ID
				);

				expect(
					install
				).not.toHaveBeenCalled();
			}
		);

		it(
			'installs the exact selected Resource on a local miss and rereads the store',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValueOnce(
							undefined
						)
						.mockResolvedValueOnce(
							BOOKNAMES
						);

				const install =
					vi.fn()
						.mockResolvedValue(
							handledResult()
						);

				const service =
					new BibleBooknamesService(
						{ get },
						{ install }
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					BOOKNAMES
				);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					BOOKNAMES
				);

				expect(
					install
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					install
				).toHaveBeenCalledWith(
					SOURCE
				);

				expect(
					get
				).toHaveBeenCalledTimes(
					2
				);
			}
		);

		it(
			'shares one in-flight Booknames load across concurrent callers',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							BOOKNAMES
						);

				const install =
					vi.fn();

				const service =
					new BibleBooknamesService(
						{ get },
						{ install }
					);

				const first =
					service.get(
						SOURCE
					);

				const second =
					service.get(
						SOURCE
					);

				await expect(
					Promise.all([
						first,
						second
					])
				).resolves.toEqual([
					BOOKNAMES,
					BOOKNAMES
				]);

				expect(
					get
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					install
				).not.toHaveBeenCalled();
			}
		);

		it(
			'accepts a Resource that is already current and rereads the store',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValueOnce(
							undefined
						)
						.mockResolvedValueOnce(
							BOOKNAMES
						);

				const service =
					new BibleBooknamesService(
						{ get },
						{
							install:
								vi.fn()
									.mockResolvedValue(
										currentResult()
									)
						}
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					BOOKNAMES
				);
			}
		);

		it(
			'throws when the selected Resource does not exist',
			async () => {
				const service =
					new BibleBooknamesService(
						{
							get:
								vi.fn()
									.mockResolvedValue(
										undefined
									)
						},
						{
							install:
								vi.fn()
									.mockResolvedValue({
										requested:
											SOURCE,
										found:
											false,
										resources:
											[]
									})
						}
					);

				await expect(
					service.get(
						SOURCE
					)
				).rejects.toThrow(
					'Bible Booknames Resource not found: publisher-a/kjvonly/bible/booknames/default'
				);
			}
		);

		it(
			'propagates Resource processing failure',
			async () => {
				const failure =
					new Error(
						'Booknames Resource failed'
					);

				const service =
					new BibleBooknamesService(
						{
							get:
								vi.fn()
									.mockResolvedValue(
										undefined
									)
						},
						{
							install:
								vi.fn()
									.mockResolvedValue(
										failedResult(
											failure
										)
									)
						}
					);

				await expect(
					service.get(
						SOURCE
					)
				).rejects.toBe(
					failure
				);
			}
		);

		it(
			'throws when successful Resource processing does not install Booknames',
			async () => {
				const service =
					new BibleBooknamesService(
						{
							get:
								vi.fn()
									.mockResolvedValue(
										undefined
									)
						},
						{
							install:
								vi.fn()
									.mockResolvedValue(
										handledResult()
									)
						}
					);

				await expect(
					service.get(
						SOURCE
					)
				).rejects.toThrow(
					`Bible Booknames were not installed: ${BOOKNAMES_ID}`
				);
			}
		);

		it(
			'rejects a source with the wrong Resource Type before reading local state',
			async () => {
				const get =
					vi.fn();

				const install =
					vi.fn();

				const service =
					new BibleBooknamesService(
						{ get },
						{ install }
					);

				await expect(
					service.get({
						publisher:
							'publisher-a',
						resourceId:
							'kjvonly/bible/chapters/kjvs'
					})
				).rejects.toThrow(
					'Invalid Bible Booknames Resource Type: kjvonly/bible/chapters'
				);

				expect(
					get
				).not.toHaveBeenCalled();

				expect(
					install
				).not.toHaveBeenCalled();
			}
		);

		it(
			'rejects a nested Booknames Resource path as a source',
			async () => {
				const service =
					new BibleBooknamesService(
						{
							get:
								vi.fn()
						},
						{
							install:
								vi.fn()
						}
					);

				await expect(
					service.get({
						publisher:
							'publisher-a',
						resourceId:
							'kjvonly/bible/booknames/default/extra'
					})
				).rejects.toThrow(
					'Invalid Bible Booknames Resource source: kjvonly/bible/booknames/default/extra'
				);
			}
		);
	}
);

function handledResult():
	ResourceInstallResult {
	return resultWithStatus(
		'handled'
	);
}

function currentResult():
	ResourceInstallResult {
	return resultWithStatus(
		'current'
	);
}

function resultWithStatus(
	status:
		'handled' |
		'current'
): ResourceInstallResult {
	return {
		requested:
			SOURCE,

		found:
			true,

		resources: [
			{
				reference:
					SOURCE,

				resourceType:
					'kjvonly/bible/booknames',

				status
			}
		]
	};
}

function failedResult(
	error:
		unknown
): ResourceInstallResult {
	return {
		requested:
			SOURCE,

		found:
			true,

		resources: [
			{
				reference:
					SOURCE,

				resourceType:
					'kjvonly/bible/booknames',

				status:
					'failed',

				error
			}
		]
	};
}
