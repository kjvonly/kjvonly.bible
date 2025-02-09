<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { chapterKey, verse, verseRefs = $bindable() } = $props();

	let verseRefs2: any[] = $state([]);
	let booknames: any;

	onMount(async () => {
		booknames = await bibleDB.getValue('booknames', 'booknames');
		let data = await bibleDB.getValue('chapters', chapterKey);
		let bookName = data['bookName'];
		let bookID = data['id'].split('_')[0];
		let bookChapter = data['number'];
		let verseNumber = verse['number'];
		let verseText = verse['text'].substring(1, verse['text'].length);

		let vrefs = $state([]);

		let vref = {
			ref: chapterKey.replaceAll('_', '/') + verseNumber,
			bookName: bookName,
			chapter: bookChapter,
			vnumber: verseNumber,
			text: verseText,
			bookID: bookID
		};

		vrefs.push(vref);

		verseRefs.forEach(async (ref: string) => {
			try {
				let index = ref.lastIndexOf('/');
				let ckey = ref.substring(0, index).replaceAll('/', '_');

				let cnumber = ckey.split('_')[1];
				let vnumber = ref.substring(index + 1, ref.length);
				let data = await bibleDB.getValue('chapters', ckey);
				let bname = data['bookName'];
				let bid = data['id'].split('_')[0];
				let v = data['verseMap'][vnumber];
				let vNoVn = v.substring(0, v.length);

				let vref = {
					ref: ref,
					bookName: bname,
					chapter: cnumber,
					vnumber: vnumber,
					text: vNoVn,
					bid: bid
				};
				vrefs.push(vref);
				console.log(vref);
			} catch (ex) {
				console.log(`error fetching ref ${ref}`);
			}
		});

		verseRefs2.push(vrefs);
	});
</script>

{#snippet vrefSnippet(vref: any)}
	<p class="px-4 py-2 text-left hover:bg-primary-100">
		<span class="font-bold">{vref.bookName} {vref.chapter}:{vref.vnumber}</span><br />
		{#each vref.text.trim().split(' ') as w}
			<span class="inline-block">{w}</span>&nbsp;
		{/each}
	</p>
{/snippet}

<div>
	<div class="py-4">
		<div class="py-4">
			{#each verseRefs2.slice().reverse() as refs, idx}
				{#if idx < 4}
					<span>{booknames['shortNames'][refs.bid]} {refs.chapter}:{refs.vnumber}</span>
				{/if}
			{/each}

			{#if verseRefs2.length > 0}
				<h1 class="py-4 font-bold underline underline-offset-8">Verse</h1>
				{@const vref = verseRefs2[verseRefs2.length - 1][0]}

				{@render vrefSnippet(vref)}

				<h1 class="py-4 font-bold underline underline-offset-8">Verse References</h1>
				{#each verseRefs2[verseRefs2.length - 1].slice(1, verseRefs2[verseRefs2.length - 1].length) as vref, idx}
					{@render vrefSnippet(vref)}
				{/each}
			{/if}
		</div>
	</div>
</div>
