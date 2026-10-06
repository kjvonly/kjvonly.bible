<script lang="ts">
	import { onMount } from 'svelte';

	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	import {
		KJVHeader
	} from '$lib/components';

	import type {
		NormalizedDocument
	} from '../../models/normalized-document.model';

	import {
		NORMALIZED_CONTENT_VIEWS
	} from '../../models/normalized-content-navigation.model';

	import NormalizedContentRenderer from '../../ui/components/normalizedContentRenderer.svelte';

	const {
		applicationReferenceResolver,
		normalizedContentService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	validateNavigationState(
		navigationState
	);

	const descriptor =
		navigationState.state.descriptor;

	const title =
		readDescriptorName(
			descriptor
		) ??
		'Document';

	const paneLayout =
		usePaneLayoutContext();

	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight: number =
		$state(0);

	let document =
		$state<NormalizedDocument>();

	let errorMessage =
		$state<string>();

	let loading =
		$state(true);

	onMount(() => {
		void loadDocument();
	});

	function onLinkActivate(
		hrefs: readonly string[]
	): boolean {
		for (const href of hrefs) {
			const destination =
				applicationReferenceResolver
					.resolve(href);

			if (!destination) {
				continue;
			}

			navigation.pushModule(
				destination.module,
				destination.view,
				destination.state
			);

			return true;
		}

		return false;
	}

	async function loadDocument(): Promise<void> {
		try {
			document =
				await normalizedContentService
					.getByDescriptor(
						descriptor
					);
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'Unable to load document.';
		} finally {
			loading = false;
		}
	}

	function validateNavigationState(
		value: unknown
	): asserts value is NormalizedContentNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.NORMALIZED_CONTENT ||
			value.view !== NORMALIZED_CONTENT_VIEWS.READER ||
			!isRecord(value.state) ||
			!isRecord(value.state.descriptor)
		) {
			throw new Error(
				'Invalid Normalized Content navigation state'
			);
		}
	}

	function readDescriptorName(
		value: unknown
	): string | undefined {
		if (!isRecord(value)) {
			return undefined;
		}

		const metadata =
			value.metadata;

		if (!isRecord(metadata)) {
			return undefined;
		}

		return typeof metadata.name === 'string' &&
			metadata.name.length > 0
			? metadata.name
			: undefined;
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		);
	}

	type NormalizedContentNavigationState =
		NavigationState<
			typeof NORMALIZED_CONTENT_VIEWS.READER
		> & {
			readonly state: {
				readonly descriptor:
					Record<string, unknown>;
			};
		};
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		{title}
		{leadingContent}
	></KJVHeader>
{/snippet}

{#snippet body()}
	{#if loading}
		<div class="py-4 text-sm text-neutral-500">
			Loading document...
		</div>
	{:else if errorMessage}
		<div class="py-4 text-sm text-red-700">
			{errorMessage}
		</div>
	{:else if document}
		<div class="py-4">
			<NormalizedContentRenderer
				{document}
				{onLinkActivate}
			></NormalizedContentRenderer>
		</div>
	{/if}
{/snippet}

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody
	{clientHeight}
	{headerHeight}
>
	{@render body()}
</ViewBody>
