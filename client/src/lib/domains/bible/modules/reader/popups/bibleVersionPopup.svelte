<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import type {
		BibleVersion
	} from '$lib/domains/bible/models/bible-version.model';

	import {
		useApplicationContext
	} from '$lib/application/runtime/application-context';

	import KJVButton
		from '$lib/components/buttons/KJVButton.svelte';

	import ArrowBack
		from '$lib/components/svgs/arrowBack.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';

	let {
		showBibleVersionPopup =
			$bindable<boolean>(),

		bibleVersion =
			$bindable<string>()
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
		bibleVersion =
			version.id;

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