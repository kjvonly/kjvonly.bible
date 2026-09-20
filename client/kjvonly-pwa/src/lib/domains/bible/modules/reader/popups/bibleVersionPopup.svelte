<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import type {
		BibleVersion
	} from '../../../models/bible-version.model';

	import {
		useApplicationContext
	} from '$lib/application';

	import KJVButton
		from '$lib/components/buttons/KJVButton.svelte';

	import ArrowBack
		from '$lib/components/svgs/arrowBack.svelte';
	import { BufferContainer } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';
	import { BufferBody } from '$lib/application/ui';

	let {
	showBibleVersionPopup =
		$bindable<boolean>(),

	onBibleVersionSelected
}: {
	showBibleVersionPopup:
		boolean;

	onBibleVersionSelected:
		(
			version:
				BibleVersion
		) => void;
} = $props();

	const {
		bibleVersionsService
	} = useApplicationContext();

	let bibleVersions:
		BibleVersion[] =
		$state([]);

	let clientHeight =
		$state(0);

	let headerHeight =
		$state(0);

	onMount(async () => {
		bibleVersions = [
			...await bibleVersionsService
				.list()
		];
	});

function onVersionClicked(
	version:
		BibleVersion
): void {

	onBibleVersionSelected(
		version
	);

	showBibleVersionPopup =
		false;
}	

	function onClose(): void {
		showBibleVersionPopup =
			false;
	}
</script>

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<KJVButton
			onClick={onClose}
			classes=""
		>
			<ArrowBack classes="" />
		</KJVButton>
	</BufferHeader>

	<BufferBody
		bind:clientHeight
		bind:headerHeight
		classes={'remove-default-class'}
	>
		{#each bibleVersions as version}
			<button
				onclick={() =>
					onVersionClicked(
						version
					)}
				class="w-full bg-neutral-50 p-4 text-start hover:bg-neutral-100"
			>
				<div class="uppercase">
					{version.version}
				</div>

				<div class="text-xs">
					{version.publisher.slice(
						0,
						12
					)}
				</div>
			</button>
		{/each}
	</BufferBody>
</BufferContainer>