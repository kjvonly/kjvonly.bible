<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { chapterKey, verse, verseRefs } = $props();

	let recursiveVerseRefs: any[] = $state([]);
	let booknames: any;

	onMount(async () => {
		booknames = await bibleDB.getValue('booknames', 'booknames');
		let verseNumber = verse['number'];
		let ref = chapterKey.replaceAll('_', '/') + '/' + verseNumber;
		let refs = [ref, ...verseRefs];
		addVerseRefs(refs);
	});

	async function addVerseRefs(refs: string[]) {
		let verseRefs: any = $state([]);
		refs.forEach(async (ref: string) => {
			try {
				let lastIndex = ref.lastIndexOf('/');
				let chapterKey = ref.substring(0, lastIndex).replaceAll('/', '_');
				let chapterNumber = chapterKey.split('_')[1];
				let verseNumber = ref.substring(lastIndex + 1, ref.length);
				let data = await bibleDB.getValue('chapters', chapterKey);
				let bookName = data['bookName'];
				let bookId = data['id'].split('_')[0];
				let verse = data['verseMap'][verseNumber];
				let verseWithoutNumber = verse.substring(0, verse.length);

				let verseRef = {
					ref: ref,
					bookName: bookName,
					chapterNumber: chapterNumber,
					verseNumber: verseNumber,
					text: verseWithoutNumber,
					bookId: bookId
				};
				verseRefs.push(verseRef);

			} catch (ex) {
				console.log(`error fetching ref ${ref}`);
			}
		});

		recursiveVerseRefs.push(verseRefs);
	}

	async function updateRefs(vref: any) {
		let index = vref.ref.lastIndexOf('/');
		let chapterKey = vref.ref.substring(0, index).replaceAll('/', '_');
		let verseNumber = vref.ref.substring(index + 1, vref.ref.length);

		let data = await bibleDB.getValue('chapters', chapterKey);
		let verse = data['verses'][verseNumber];
		let refKeys = [vref.ref];
		verse.words.forEach((w: any) => {
			w.href?.forEach((ref: string) => {
				let match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
				if (match) {
					refKeys.push(ref);
				}
			});
		});
		addVerseRefs(refKeys);
	}

	function onNavigateRefs(idx: number) {
		if (idx <= recursiveVerseRefs.length - 1) {
			recursiveVerseRefs.splice(idx, recursiveVerseRefs.length);
		}
	}
</script>

{#snippet refCurrentVerse(vref: any)}
	{#if vref}
		<p class="px-4 py-2 text-left">
			<span class="font-bold">{vref.bookName} {vref.chapterNumber}:{vref.verseNumber}</span><br />
			{#each vref.text.trim().split(' ') as w}
				<span class="inline-block">{w}</span>&nbsp;
			{/each}
		</p>
	{/if}
{/snippet}

{#snippet refVerse(vref: any)}
	{#if vref}
		<button
			onclick={() => {
				updateRefs(vref);
			}}
		>
			<p class="cursor-pointer px-4 py-2 text-left hover:bg-primary-100">
				<span class="font-bold">{vref.bookName} {vref.chapterNumber}:{vref.verseNumber}</span><br />
				{#each vref.text.trim().split(' ') as w}
					<span class="inline-block">{w}</span>&nbsp;
				{/each}
			</p>
		</button>
	{/if}
{/snippet}

<div>
	<div class="py-4">
		<div class="py-4">
			{#each recursiveVerseRefs as refs, idx}
				{#if idx > recursiveVerseRefs.length - 4 && refs[0]}
					{#if recursiveVerseRefs.length > 3 && idx === recursiveVerseRefs.length - 3}
						<span class="underline underline-offset-8">...</span>
					{/if}
					{#if idx !== 0}
						<span>&nbsp;/ </span>
					{/if}
					<button
						onclick={() => {
							onNavigateRefs(idx + 1);
						}}
					>
						<span class="underline underline-offset-8"
							>{booknames['shortNames'][refs[0].bookId]} {refs[0].chapterNumber}:{refs[0].verseNumber}</span
						></button
					>
				{/if}
			{/each}

			{#if recursiveVerseRefs.length > 0}
				<h1 class="py-4 font-bold underline underline-offset-8">Verse</h1>
				{@const vref = recursiveVerseRefs[recursiveVerseRefs.length - 1][0]}

				{@render refCurrentVerse(vref)}

				{#if recursiveVerseRefs[recursiveVerseRefs.length - 1].length > 1}
					<h1 class="py-4 font-bold underline underline-offset-8">Verse References</h1>
					{#each recursiveVerseRefs[recursiveVerseRefs.length - 1].slice(1, recursiveVerseRefs[recursiveVerseRefs.length - 1].length) as vref, idx}
						{@render refVerse(vref)}
					{/each}
				{/if}
			{/if}
		</div>
	</div>
</div>
