<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import type {
		BibleVersion
	} from '../../../models/bible-version.model';

	import {
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import KJVButton
		from '$lib/components/buttons/KJVButton.svelte';

	import ArrowBack
		from '$lib/components/svgs/arrowBack.svelte';
	import { BufferHeader } from '$lib/application/ui';
	import { BufferBody } from '$lib/application/ui';

	let {
		clientHeight,
		obj: _obj
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	void _obj;

	const {
		bibleVersionsService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	let bibleVersions:
		BibleVersion[] =
		$state([]);

	let headerHeight =
		$state(0);

	onMount(async () => {
		bibleVersions = [
			...await bibleVersionsService
				.list()
		];
	});

	async function onVersionClicked(
		version: BibleVersion
	): Promise<void> {
		await navigation.backWithResult({
			type: 'bible-version',
			id: version.id,
			publisher: version.publisher,
			version: version.version
		});
	}

	function onClose(): void {
		navigation.back();
	}
</script>

<BufferHeader bind:headerHeight>
	<KJVButton
		onClick={onClose}
		classes=""
	>
		<ArrowBack classes="" />
	</KJVButton>
</BufferHeader>

<BufferBody
	{clientHeight}
	{headerHeight}
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
