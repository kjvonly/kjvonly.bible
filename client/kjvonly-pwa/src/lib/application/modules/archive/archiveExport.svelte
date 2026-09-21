<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import type { NavigationComponentProps } from '$lib/application/services/navigation.service';
	import {
		parseKJVOnlyArchiveExportPatterns,
		type KJVOnlyArchiveExportSelection
	} from '$lib/application/archive/kjvonly-archive-export-selection';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import ExportIcon from '$lib/components/svgs/export.svelte';

	// ================================= TYPES =================================

	type ArchiveExportOption = {
		label: string;
		objectType: string;
		selected: boolean;
		filter: string;
		placeholder: string;
	};

	// =============================== BINDINGS ================================

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	}: NavigationComponentProps = $props();

	// ================================= VARS ==================================

	let headerHeight: number = $state(0);
	let exporting = $state(false);

	const {
		archiveService,
		toastService
	} = useApplicationContext();

	let options = $state<ArchiveExportOption[]>([
		{
			label: 'Bible Chapters',
			objectType: 'bible/chapter',
			selected: false,
			filter: '',
			placeholder: 'kjv/*,kjvs/*'
		},
		{
			label: 'Bible Book Names',
			objectType: 'bible/booknames',
			selected: false,
			filter: '',
			placeholder: 'default'
		},
		{
			label: 'Bible Paragraphs',
			objectType: 'bible/paragraphs',
			selected: false,
			filter: '',
			placeholder: 'default/*'
		},
		{
			label: 'Bible Pericopes',
			objectType: 'bible/pericopes',
			selected: false,
			filter: '',
			placeholder: 'default/*'
		},
		{
			label: 'Bible Text Markups',
			objectType: 'bible/text-markup',
			selected: true,
			filter: '',
			placeholder: 'default/*,*sermon*'
		},
		{
			label: 'Bible Search Indexes',
			objectType: 'bible/search-index',
			selected: false,
			filter: '',
			placeholder: 'kjv,kjvs'
		},
		{
			label: 'Notes',
			objectType: 'notes/note',
			selected: true,
			filter: '',
			placeholder: 'default/*,*my-sermon-note*'
		},
		{
			label: 'Reading Plan Definitions',
			objectType: 'reading-plans/plan-definition',
			selected: false,
			filter: '',
			placeholder: 'default/*'
		},
		{
			label: 'Reading Plan Subscriptions',
			objectType: 'reading-plans/plan-subscription',
			selected: true,
			filter: '',
			placeholder: 'default/*'
		},
		{
			label: 'Reading Plan Progress',
			objectType: 'reading-plans/plan-progress',
			selected: true,
			filter: '',
			placeholder: 'default/*'
		},
		{
			label: "Strong's Definitions",
			objectType: 'strongs/definition',
			selected: false,
			filter: '',
			placeholder: 'kjv/*,kjvs/*'
		}
	]);

	// ================================ FUNCS ==================================

	function downloadArchive(
		bytes: Uint8Array
	): void {
		const blob =
			new Blob(
				[new Uint8Array(bytes)],
				{
					type:
						'application/gzip'
				}
			);

		const url =
			URL.createObjectURL(
				blob
			);

		const anchor =
			document.createElement(
				'a'
			);

		anchor.href = url;
		anchor.download =
			`kjvonly-${new Date().toISOString().slice(0, 10)}.kjva`;
		anchor.style.display = 'none';

		document.body.appendChild(
			anchor
		);

		anchor.click();
		anchor.remove();

		URL.revokeObjectURL(
			url
		);
	}

	// ============================== CLICK FUNCS ==============================

	function onBack(): void {
		navService.pop();
	}


	async function onExport(): Promise<void> {
		if (exporting) {
			return;
		}

		const types = options
			.filter(
				(option) =>
					option.selected
			)
			.map(
				(option) => {
					const patterns =
						parseKJVOnlyArchiveExportPatterns(
							option.filter
						);

					return {
						objectType:
							option.objectType,
						...(
							patterns.length > 0
								? { patterns }
								: {}
						)
					};
				}
			);

		if (types.length === 0) {
			toastService.showToast(
				'Select at least one data type to export.'
			);
			return;
		}

		const selection:
			KJVOnlyArchiveExportSelection = {
				types
			};

		exporting = true;
		toastService.showToast(
			'Starting archive export.'
		);

		try {
			const bytes =
				await archiveService.export(
					selection
				);

			downloadArchive(
				bytes
			);

			toastService.showToast(
				'Archive export finished.'
			);
		} catch (error) {
			console.error(
				'KJVOnly archive export failed.',
				error
			);

			toastService.showToast(
				'Archive export failed.'
			);
		} finally {
			exporting = false;
		}
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex flex-1 justify-start">
		<KJVButton classes="" onClick={onBack}>
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-center">Export</span>

	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onExport} disabled={exporting}>
			<ExportIcon classes=""></ExportIcon>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="flex w-full flex-col gap-3 p-4">
		<div class="text-sm text-neutral-500">
			Leave a filter blank to export all records of that type. Separate filters with commas; * is a wildcard.
		</div>

		<div class="flex flex-col gap-2">
			{#each options as option}
				<div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-sm bg-neutral-50 p-3 sm:grid-cols-[auto_minmax(10rem,1fr)_minmax(10rem,1fr)]">
					<input
						bind:checked={option.selected}
						type="checkbox"
						class="accent-support-a-300 size-4 rounded-sm border-neutral-200"
						aria-label={`Export ${option.label}`}
					/>

					<span class="text-sm font-medium">
						{option.label}
					</span>

					<input
						bind:value={option.filter}
						disabled={!option.selected}
						type="text"
						placeholder={option.placeholder}
						aria-label={`${option.label} filter`}
						class="col-span-2 h-9 rounded-sm border border-neutral-200 bg-white px-2 text-sm outline-hidden disabled:bg-neutral-100 disabled:text-neutral-400 sm:col-span-1"
					/>
				</div>
			{/each}
		</div>

	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>

<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
