<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// APPLICATION
	import {
		useApplicationContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// BIBLE
	import {
		BibleReferenceLabelService,
		type BibleChapterVerseCountLookup
	} from '$lib/domains/bible';

	// COMPONENTS
	import {
		KJVAdaptiveText,
		KJVCard,
		KJVHeader,
		KJVIconButton
	} from '$lib/components';
	import BookRibbon from '$lib/components/svgs/bookRibbon.svelte';
	import PlansLoadState from '../components/plansLoadState.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type Sub
	} from '../../../models/plans.model';
	import type { PlansViewLoadState } from '../runtime/plans-view-load-state';

	const {
		petNameService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	// =============================== BINDINGS ================================
	let {
		subsList,
		verseCountByBookChapter,
		shortBookNamesById,
		loadState,
		onRetryLoad,
		onSubSelected,
		onNextReadingSelected
	}: {
		subsList: Sub[];
		verseCountByBookChapter:
			BibleChapterVerseCountLookup;
		shortBookNamesById:
			Readonly<Record<string, string>>;
		loadState: PlansViewLoadState;
		onRetryLoad: () => void;
		onSubSelected: (sub: Sub) => void;
		onNextReadingSelected: (sub: Sub) => void;
	} = $props();

	// ================================== VARS =================================
	let headerHeight = $state(0);
	const bibleReferenceLabelService =
		new BibleReferenceLabelService();

	// ============================== CLICK FUNCS ==============================

	function onSubClicked(sub: Sub): void {
		onSubSelected(sub);
	}

	function onDiscoverPlansClicked(): void {
		navigation.pushView(
			PLANS_VIEWS.PLANS_LIST,
			{}
		);
	}

	// ================================ DISPLAY ================================

	function hasNextReading(sub: Sub): boolean {
		return (
			sub.nextReadingsIndex >= 0 &&
			sub.nextReadingsIndex < sub.nestedReadings.length
		);
	}

	function nextReadingLabel(
		sub: Sub,
		useShortBookNames = false
	): string {
		const reading =
			sub.nestedReadings[sub.nextReadingsIndex];

		if (!reading) {
			return 'Completed';
		}

		const visible = reading.bcvs
			.slice(0, 2)
			.map((bcv) =>
				bibleReferenceLabelService.format(
					bcv,
					verseCountByBookChapter,
					useShortBookNames
						? shortBookNamesById[
							String(bcv.bookID)
						] ?? bcv.bookName
						: bcv.bookName
				)
			);

		const hiddenCount =
			reading.bcvs.length - visible.length;

		return [
			...visible,
			hiddenCount > 0
				? `+${hiddenCount}`
				: undefined
		]
			.filter(
				(value): value is string =>
					value !== undefined
			)
			.join(' · ');
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="My Plans"
		{leadingContent}
		actions={[
			{
				icon: 'document-search',
				label: 'Discover plans',
				onClick: onDiscoverPlansClicked
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet subsListView()}
	{#if loadState !== 'ready'}
		<PlansLoadState
			state={loadState}
			onRetry={onRetryLoad}
			inset={false}
			subject="plans"
		></PlansLoadState>
	{:else}
		<div class="flex w-full flex-col gap-4 py-4">
			{#each subsList as s}
			<KJVCard
				onClick={() => onSubClicked(s)}
				label={`Open ${s.name} plan details`}
			>
				{#snippet header()}
					<div class="flex w-full min-w-0 items-start gap-4">
						<div class="min-w-0 flex-1">
							<div class="truncate text-base text-neutral-700">
								{s.name}
							</div>
							<div
								class="truncate text-sm text-neutral-500"
								title={s.publisher}
							>
								Published by {petNameService.resolve(s.publisher)}
							</div>
						</div>

						<span class="shrink-0 text-sm text-support-a-500">
							{s.percentCompleted}%
						</span>
					</div>
				{/snippet}

				{#snippet body()}
					<p class="line-clamp-2 text-sm text-neutral-600">
						{s.description}
					</p>
				{/snippet}

				{#snippet actions()}
					<div class="min-w-0 flex-1 text-sm text-neutral-500">
						{#if hasNextReading(s)}
							<div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-1">
								<span class="text-neutral-700">Next:</span>
								<KJVAdaptiveText
									longText={nextReadingLabel(s)}
									shortText={nextReadingLabel(s, true)}
									wrap
								></KJVAdaptiveText>
							</div>
						{:else}
							<span>Completed</span>
						{/if}
					</div>

					{#if hasNextReading(s)}
						<KJVIconButton
							label="Open next reading"
							variant="quiet"
							onClick={() => onNextReadingSelected(s)}
						>
							<BookRibbon classes="h-[1.25em] w-[1.25em] text-primary-500" />
						</KJVIconButton>
					{/if}
				{/snippet}
			</KJVCard>
			{/each}
		</div>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody clientHeight={paneLayout.clientHeight} {headerHeight}>
	{@render subsListView()}
</ViewBody>
