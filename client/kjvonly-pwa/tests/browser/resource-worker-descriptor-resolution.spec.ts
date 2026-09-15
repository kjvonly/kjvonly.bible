import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceResolutionStrategy
} from '$lib/resource/resolution/resource-resolution-strategy';

import {
	createBrowserResourceWorkerClient
} from '$lib/resource/worker/resource-worker-client';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-definitions-store';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from '$lib/domains/reading-plans/resources/definitions/plan-definition-interpreter';

import {
	createPlanDefinitionId
} from '$lib/domains/reading-plans/models/plan-definition-id';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

const ROOT_RESOURCE_ID =
	'kjvonly/resources/collections/default';

const NESTED_RESOURCE_ID =
	'kjvonly/plans/readings/default';

const TERMINAL_RESOURCE_ID =
	'kjvonly/plans/readings/default/browser-test';

describe(
	'Resource Worker descriptor resolution',
	() => {

		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					DOMAIN_OBJECTS
				);

				await db.clear(
					RESOURCE_INSTALLATIONS
				);

				await db.clear(
					RESOURCE_RECEIPTS
				);
			}
		);

		it(
			'recursively resolves nested descriptors through real browser Workers',
			async () => {
				const rootPublisher =
					createPublisher();

				const nestedPublisher =
					createPublisher();

				const terminalPublisher =
					createPublisher();

				const reference:
					PublishedResourceReference = {
					publisher:
						rootPublisher,

					resourceId:
						ROOT_RESOURCE_ID
				};

				const terminalDescriptor =
					createDescriptor({
						publisher:
							terminalPublisher,

						resourceId:
							TERMINAL_RESOURCE_ID,

						representation:
							'content',

						modifiedAt:
							300
					});

				const nestedDescriptor =
					createDescriptor({
						publisher:
							nestedPublisher,

						resourceId:
							NESTED_RESOURCE_ID,

						representation:
							'descriptors',

						modifiedAt:
							200
					});

				const discovery =
					new FakeDiscovery(
						createRootRepresentation(
							reference,
							[
								nestedDescriptor
							]
						)
					);

				const plan = {
					name:
						'Browser Test Plan',

					description:
						'Nested descriptor browser integration test.',

					encodedReadings: [
						'1/1/1-1'
					]
				};

				const strategy =
					new FakeNostrResolutionStrategy(
						new Map([
							[
								createDescriptorKey(
									nestedDescriptor
								),
								encodeJson([
									terminalDescriptor
								])
							],
							[
								createDescriptorKey(
									terminalDescriptor
								),
								encodeJson(
									plan
								)
							]
						])
					);

				const client =
					createBrowserResourceWorkerClient(
						discovery,
						[
							strategy
						]
					);

				try {
					const result =
						await client.install(
							reference
						);

					expect(
						result
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference: {
									publisher:
										terminalPublisher,

									resourceId:
										TERMINAL_RESOURCE_ID
								},

								resourceType:
									PLAN_DEFINITION_RESOURCE_TYPE,

								status:
									'handled'
							}
						]
					});

					/*
					 * Only the root Resource crosses the Discovery
					 * bridge. Nested Resources are resolved by the
					 * descriptor worker through the strategy bridge.
					 */
					expect(
						discovery.references
					).toEqual([
						reference
					]);

					expect(
						strategy.descriptors.map(
							(descriptor) =>
								descriptor.metadata.resourceId
						)
					).toEqual([
						NESTED_RESOURCE_ID,
						TERMINAL_RESOURCE_ID
					]);

					const definitionId =
						createPlanDefinitionId(
							terminalPublisher,
							'default',
							'browser-test'
						);

					const db =
						await getApplicationDB();

					expect(
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								PLAN_DEFINITION_OBJECT_TYPE,
								definitionId
							)
						)
					).toEqual({
						id:
							createStoredDomainObjectId(
								PLAN_DEFINITION_OBJECT_TYPE,
								definitionId
							),

						objectType:
							PLAN_DEFINITION_OBJECT_TYPE,

						objectId:
							definitionId,

						value: {
							id:
								definitionId,

							...plan
						}
					});

					const second =
						await client.install(
							reference
						);

					expect(
						second
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference: {
									publisher:
										terminalPublisher,

									resourceId:
										TERMINAL_RESOURCE_ID
								},

								resourceType:
									PLAN_DEFINITION_RESOURCE_TYPE,

								status:
									'current'
							}
						]
					});

					/*
					 * Collections themselves are traversed again,
					 * while the terminal receipt prevents another
					 * terminal retrieval.
					 */
					expect(
						strategy.descriptors.map(
							(descriptor) =>
								descriptor.metadata.resourceId
						)
					).toEqual([
						NESTED_RESOURCE_ID,
						TERMINAL_RESOURCE_ID,
						NESTED_RESOURCE_ID
					]);

					expect(
						discovery.references
					).toEqual([
						reference,
						reference
					]);
				} finally {
					client.dispose();
				}
			}
		);

		it(
			'preserves a nested strategy failure across the browser Worker bridge',
			async () => {
				const rootPublisher =
					createPublisher();

				const nestedPublisher =
					createPublisher();

				const terminalPublisher =
					createPublisher();

				const reference:
					PublishedResourceReference = {
					publisher:
						rootPublisher,

					resourceId:
						ROOT_RESOURCE_ID
				};

				const terminalDescriptor =
					createDescriptor({
						publisher:
							terminalPublisher,

						resourceId:
							TERMINAL_RESOURCE_ID,

						representation:
							'content',

						modifiedAt:
							300
					});

				const nestedDescriptor =
					createDescriptor({
						publisher:
							nestedPublisher,

						resourceId:
							NESTED_RESOURCE_ID,

						representation:
							'descriptors',

						modifiedAt:
							200
					});

				const discovery =
					new FakeDiscovery(
						createRootRepresentation(
							reference,
							[
								nestedDescriptor
							]
						)
					);

				const strategy =
					new FakeNostrResolutionStrategy(
						new Map([
							[
								createDescriptorKey(
									nestedDescriptor
								),
								encodeJson([
									terminalDescriptor
								])
							]
						]),
						TERMINAL_RESOURCE_ID
					);

				const client =
					createBrowserResourceWorkerClient(
						discovery,
						[
							strategy
						]
					);

				try {
					const result =
						await client.install(
							reference
						);

					expect(
						result
					).toMatchObject({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference: {
									publisher:
										terminalPublisher,

									resourceId:
										TERMINAL_RESOURCE_ID
								},

								resourceType:
									PLAN_DEFINITION_RESOURCE_TYPE,

								status:
									'failed',

								error:
									expect.objectContaining({
										message:
											'Browser test nested strategy failure.'
									})
							}
						]
					});

					expect(
						discovery.references
					).toEqual([
						reference
					]);

					expect(
						strategy.descriptors.map(
							(descriptor) =>
								descriptor.metadata.resourceId
						)
					).toEqual([
						NESTED_RESOURCE_ID,
						TERMINAL_RESOURCE_ID
					]);
				} finally {
					client.dispose();
				}
			}
		);
	}
);

interface DescriptorOptions {
	readonly publisher:
		string;

	readonly resourceId:
		string;

	readonly representation:
		ResourceDescriptor['metadata']['representation'];

	readonly modifiedAt:
		number;
}

function createDescriptor(
	options:
		DescriptorOptions
): ResourceDescriptor {
	return {
		metadata: {
			publisher:
				options.publisher,

			resourceId:
				options.resourceId,

			category:
				PLAN_DEFINITION_RESOURCE_TYPE,

			modifiedAt:
				options.modifiedAt,

			representation:
				options.representation,

			mediaType:
				'application/json'
		},

		strategy: {
			type:
				'nostr',

			data:
				{}
		}
	};
}

function createRootRepresentation(
	reference:
		PublishedResourceReference,

	descriptors:
		readonly ResourceDescriptor[]
): ResourceRepresentation {
	return {
		publisher:
			reference.publisher,

		resourceId:
			reference.resourceId,

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			400,

		representation:
			'descriptors',

		mediaType:
			'application/json',

		payload:
			JSON.stringify(
				descriptors
			)
	};
}

function encodeJson(
	value:
		unknown
): Uint8Array {
	return new TextEncoder()
		.encode(
			JSON.stringify(
				value
			)
		);
}

function createDescriptorKey(
	descriptor:
		ResourceDescriptor
): string {
	return JSON.stringify([
		descriptor.metadata.publisher,
		descriptor.metadata.resourceId
	]);
}

function createPublisher():
	string {
	const value =
		crypto
			.randomUUID()
			.replaceAll(
				'-',
				''
			);

	return (
		value +
		value
	);
}

class FakeDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
	) { }

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		this.references.push(
			reference
		);

		return this.representation;
	}
}

class FakeNostrResolutionStrategy
	implements ResourceResolutionStrategy {

	readonly type =
		'nostr';

	readonly descriptors:
		ResourceDescriptor[] =
			[];

	constructor(
		private readonly contents:
			ReadonlyMap<
				string,
				Uint8Array
			>,

		private readonly failingResourceId?:
			string
	) { }

	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<Uint8Array> {
		this.descriptors.push(
			descriptor
		);

		if (
			descriptor.metadata.resourceId ===
			this.failingResourceId
		) {
			throw new Error(
				'Browser test nested strategy failure.'
			);
		}

		const content =
			this.contents.get(
				createDescriptorKey(
					descriptor
				)
			);

		if (
			content ===
			undefined
		) {
			throw new Error(
				`Missing browser test Resource content: ${descriptor.metadata.resourceId}`
			);
		}

		return content;
	}
}
