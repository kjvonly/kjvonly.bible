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
		verseRefs2.push(vrefs);

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
					bookID: bid
				};
				vrefs.push(vref);
				console.log(vref);
			} catch (ex) {
				console.log(`error fetching ref ${ref}`);
			}
			console.log(vrefs);
		});
	});

	async function addVerseRefs(refs) {
		let vrefs = $state([]);
		refs.forEach(async (ref) => {
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
					bookID: bid
				};
				vrefs.push(vref);

				console.log('ref2', verseRefs2);
			} catch (ex) {
				console.log(`error fetching ref ${ref}`);
			}
		});

		verseRefs2.push(vrefs);
	}

	async function updateRefs(vref: any) {
		let index = vref.ref.lastIndexOf('/');
		let ckey = vref.ref.substring(0, index).replaceAll('/', '_');
		let vnumber = vref.ref.substring(index + 1, vref.ref.length);

		let data = await bibleDB.getValue('chapters', ckey);
		let verse = data['verses'][vnumber];
		let refKeys = [vref.ref];
		verse.words.forEach((w) => {
			w.hrefs?.forEach((ref) => {
				let match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
				if (match) {
					refKeys.push(ref);
				}
			});
		});
		addVerseRefs(refKeys);
	}

	function onNavigateRefs(idx: number) {
		if (idx <= verseRefs2.length - 1) {
			verseRefs2.splice(idx, verseRefs2.length);
		}
	}
</script>

{#snippet refCurrentVerse(vref: any)}
	{#if vref}
		<p class="px-4 py-2 text-left">
			<span class="font-bold">{vref.bookName} {vref.chapter}:{vref.vnumber}</span><br />
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
				<span class="font-bold">{vref.bookName} {vref.chapter}:{vref.vnumber}</span><br />
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
			{#each verseRefs2 as refs, idx}
				{#if idx > verseRefs2.length - 4 && refs[0]}
					{#if idx !== 0}
						<span>&nbsp;/ </span>
					{/if}
					<button
						onclick={() => {
							onNavigateRefs(idx + 1);
						}}
					>
						<span class="underline underline-offset-8"
							>{booknames['shortNames'][refs[0].bookID]} {refs[0].chapter}:{refs[0].vnumber}</span
						></button
					>
				{/if}
			{/each}

			{#if verseRefs2.length > 0}
				<h1 class="py-4 font-bold underline underline-offset-8">Verse</h1>
				{@const vref = verseRefs2[verseRefs2.length - 1][0]}

				{@render refCurrentVerse(vref)}

				{#if verseRefs2[verseRefs2.length - 1].length > 1}
					<h1 class="py-4 font-bold underline underline-offset-8">Verse References</h1>
					{#each verseRefs2[verseRefs2.length - 1].slice(1, verseRefs2[verseRefs2.length - 1].length) as vref, idx}
						{@render refVerse(vref)}
					{/each}
				{/if}
			{/if}
		</div>
	</div>
</div>
