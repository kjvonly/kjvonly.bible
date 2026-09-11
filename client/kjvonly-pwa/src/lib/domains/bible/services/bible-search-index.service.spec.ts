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
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	BibleSearchIndexService
} from './bible-search-index.service';

const SOURCE:
	PublishedResourceReference = {
		publisher:
			'publisher-a',

		resourceId:
			'kjvonly/bible/search/kjvs'
	};

const SEARCH_INDEX_ID =
	'publisher-a/kjvs';

const SEARCH_INDEX:
	BibleSearchIndex = {
		id:
			SEARCH_INDEX_ID,

		version:
			'kjvs',

		chunks: {
			reg:
				'{}',
			cfg:
				'{}',
			map:
				'{}',
			ctx:
				'{}'
		}
	};

describe(
	'BibleSearchIndexService',
	() => {
		it(
			'returns an already installed Search Index without installing the Resource',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							SEARCH_INDEX
						);

				const install =
					vi.fn();

				const service =
					new BibleSearchIndexService(
						{ get },
						{ install }
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					SEARCH_INDEX
				);

				expect(
					get
				).toHaveBeenCalledWith(
					SEARCH_INDEX_ID
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
							SEARCH_INDEX
						);

				const install =
					vi.fn()
						.mockResolvedValue(
							handledResult()
						);

				const service =
					new BibleSearchIndexService(
						{ get },
						{ install }
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					SEARCH_INDEX
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
			'accepts a Resource that is already current and rereads the Domain Store',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValueOnce(
							undefined
						)
						.mockResolvedValueOnce(
							SEARCH_INDEX
						);

				const install =
					vi.fn()
						.mockResolvedValue(
							currentResult()
						);

				const service =
					new BibleSearchIndexService(
						{ get },
						{ install }
					);

				await expect(
					service.get(
						SOURCE
					)
				).resolves.toBe(
					SEARCH_INDEX
				);
			}
		);

		it(
			'throws when the selected Resource does not exist',
			async () => {
				const service =
					new BibleSearchIndexService(
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
					'Bible Search Index Resource not found: publisher-a/kjvonly/bible/search/kjvs'
				);
			}
		);

		it(
			'propagates Resource processing failure',
			async () => {
				const failure =
					new Error(
						'Search Resource failed'
					);

				const service =
					new BibleSearchIndexService(
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
			'throws when the selected Search Resource is unsupported',
			async () => {
				const service =
					new BibleSearchIndexService(
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
										unsupportedResult()
									)
						}
					);

				await expect(
					service.get(
						SOURCE
					)
				).rejects.toThrow(
					'Unsupported Bible Search Resource: kjvonly/bible/search'
				);
			}
		);

		it(
			'throws when successful Resource processing does not install the Search Index',
			async () => {
				const service =
					new BibleSearchIndexService(
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
					`Bible Search Index was not installed: ${SEARCH_INDEX_ID}`
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
					new BibleSearchIndexService(
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
					'Invalid Bible Search Resource Type: kjvonly/bible/chapters'
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
			'rejects an individual-style Search Resource path as a source',
			async () => {
				const service =
					new BibleSearchIndexService(
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
							'kjvonly/bible/search/kjvs/extra'
					})
				).rejects.toThrow(
					'Invalid Bible Search Resource source: kjvonly/bible/search/kjvs/extra'
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

function unsupportedResult():
	ResourceInstallResult {
	return resultWithStatus(
		'unsupported'
	);
}

function resultWithStatus(
	status:
		'handled' |
		'current' |
		'unsupported'
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
					'kjvonly/bible/search',

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
					'kjvonly/bible/search',

				status:
					'failed',

				error
			}
		]
	};
}
