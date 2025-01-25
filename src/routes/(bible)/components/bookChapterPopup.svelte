<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let { chapterKey = $bindable(), showBookChapterPopup = $bindable() } = $props();
	let bookNames: any = $state();
	let bookIds: any;
	let bookNamesSorted: any[] = $state([]);
	let filteredBooks: any[] = $state([]);
	let filterText: string = $state('');
	let selectedBook: any = $state();
	let group = $state(true);

	let bookGroups = {
		'1': {
			name: 'Gen',
			group: 'law',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'2': {
			name: 'Exo',
			group: 'law',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'3': {
			name: 'Lev',
			group: 'law',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'4': {
			name: 'Num',
			group: 'law',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'5': {
			name: 'Deu',
			group: 'law',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'6': {
			name: 'Jos',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'7': {
			name: 'Jud',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'8': {
			name: 'Rut',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'9': {
			name: '1Sa',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'10': {
			name: '2Sa',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'11': {
			name: '1Ki',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'12': {
			name: '2Ki',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'13': {
			name: '1Ch',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'14': {
			name: '2Ch',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'15': {
			name: 'Ezr',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'16': {
			name: 'Neh',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'19': {
			name: 'Est',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'22': {
			name: 'Job',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'23': {
			name: 'Psa',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'24': {
			name: 'Pro',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'25': {
			name: 'Ecc',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'26': {
			name: 'Son',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'29': {
			name: 'Isa',
			group: 'major prophets',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'30': {
			name: 'Jer',
			group: 'major prophets',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'31': {
			name: 'Lam',
			group: 'poetry',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'33': {
			name: 'Eze',
			group: 'major prophets',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'34': {
			name: 'Dan',
			group: 'major prophets',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'35': {
			name: 'Hos',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'36': {
			name: 'Joe',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'37': {
			name: 'Amo',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'38': {
			name: 'Oba',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'39': {
			name: 'Jon',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'40': {
			name: 'Mic',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'41': {
			name: 'Nah',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'42': {
			name: 'Hab',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'43': {
			name: 'Zep',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'44': {
			name: 'Hag',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'45': {
			name: 'Zec',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'46': {
			name: 'Mal',
			group: 'minor prophets',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		},
		'47': {
			name: 'Mat',
			group: 'gospel',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'48': {
			name: 'Mar',
			group: 'gospel',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'49': {
			name: 'Luk',
			group: 'gospel',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'50': {
			name: 'Joh',
			group: 'gospel',
			bgcolor: 'bg-law-bg',
			textcolor: 'text-law-text'
		},
		'51': {
			name: 'Act',
			group: 'history',
			bgcolor: 'bg-history-bg',
			textcolor: 'text-history-text'
		},
		'52': {
			name: 'Rom',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'53': {
			name: '1Co',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'54': {
			name: '2Co',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'55': {
			name: 'Gal',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'56': {
			name: 'Eph',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'57': {
			name: 'Phi',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'58': {
			name: 'Col',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'59': {
			name: '1Th',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'60': {
			name: '2Th',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'61': {
			name: '1Ti',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'62': {
			name: '2Ti',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'63': {
			name: 'Tit',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'64': {
			name: 'Phm',
			group: 'letter of Paul',
			bgcolor: 'bg-poetry-bg',
			textcolor: 'text-poetry-text'
		},
		'65': {
			name: 'Heb',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'66': {
			name: 'Jam',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'67': {
			name: '1Pe',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'68': {
			name: '2Pe',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'69': {
			name: '1Jo',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'70': {
			name: '2Jo',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'71': {
			name: '3Jo',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'72': {
			name: 'Jude',
			group: 'letters',
			bgcolor: 'bg-major-prophets-bg',
			textcolor: 'text-major-prophets-text'
		},
		'73': {
			name: 'Rev',
			group: 'prophecy',
			bgcolor: 'bg-minor-prophets-bg',
			textcolor: 'text-minor-prophets-text'
		}
	};

	$effect(() => {
		filterText;

		filteredBooks = bookNamesSorted.filter((book: { name: string; id: number }) => {
			return book.name.toLowerCase().includes(filterText.toLowerCase());
		});
	});

	onMount(async () => {
		bookNames = await chapterService.getChapter('booknames');
		bookIds = Object.keys(bookNames['booknamesById']).sort((a, b) =>
			Number(a) < Number(b) ? -1 : 1
		);

		for (const i of bookIds) {
			bookNamesSorted.push({ id: i, name: bookNames['booknamesById'][i] });
			filteredBooks.push({ id: i, name: bookNames['booknamesById'][i] });
		}
	});

	function bookSelected(event: Event, bn: any) {
		event.stopPropagation();
		selectedBook = bn;
	}
	function chapterSelected(ch: any) {
		chapterKey = `${selectedBook.id}_${ch}`;
		showBookChapterPopup = false;
		selectedBook = undefined;
	}
</script>

<div class="h-full w-full justify-start justify-items-start overflow-y-scroll bg-neutral-100">
	<header class="items sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700">
		<div class="flex w-full justify-between p-2">
			{#if !selectedBook}
				<button
					onclick={() => {
						group = !group;
					}}
					class="h-8 w-8"
				>
					{#if !group}
						<svg
							version="1.1"
							id="svg2"
							width="100%"
							height="100%"
							viewBox="0 0 133.33333 133.33333"
							xmlns="http://www.w3.org/2000/svg"
						>
							<defs id="defs6" />
							<g id="g8">
								<path
									class="fill-neutral-700"
									d="m 11.555555,121.77777 c -0.488889,-0.48888 -0.888889,-5.88888 -0.888889,-12 V 98.666664 h 12 12 v 11.999996 12 H 23.555555 c -6.111111,0 -11.511111,-0.4 -12,-0.88889 z M 39.999999,110.66666 V 98.666664 h 12 11.999999 v 11.999996 12 h -11.999999 -12 z m 29.333333,0 V 98.666664 h 11.999999 12 v 11.999996 12 h -12 -11.999999 z m 29.333332,0.0519 V 98.666664 h 12.051906 12.05191 L 122.38524,110.33333 122,122 l -11.66667,0.38524 -11.666666,0.38524 z M 10.666666,81.333331 V 69.333332 h 12 12 v 11.999999 12 h -12 -12 z m 29.333333,0 V 69.333332 h 12 11.999999 v 11.999999 12 h -11.999999 -12 z m 29.333333,0 V 69.333332 h 11.999999 12 v 11.999999 12 h -12 -11.999999 z m 29.333332,0 V 69.333332 h 11.999996 12 v 11.999999 12 h -12 -11.999996 z M 10.666666,51.999999 v -12 h 12 12 v 12 11.999999 h -12 -12 z m 29.333333,0 v -12 h 12 11.999999 v 12 11.999999 h -11.999999 -12 z m 29.333333,0 v -12 h 11.999999 12 v 12 11.999999 h -12 -11.999999 z m 29.333332,0 v -12 h 11.999996 12 v 12 11.999999 h -12 -11.999996 z m -87.718575,-29 0.385244,-11.666666 11.666666,-0.385244 11.666667,-0.385244 v 12.05191 12.051911 H 22.614755 10.562845 Z m 29.05191,-0.333333 v -12 h 12 11.999999 v 12 12 h -11.999999 -12 z m 29.333333,0 v -12 h 11.999999 12 v 12 12 h -12 -11.999999 z m 29.333332,-0.05191 V 10.562845 L 110.33333,10.948089 122,11.333333 l 0.38524,11.666666 0.38524,11.666667 H 110.71857 98.666664 Z"
									id="path170"
								/>
							</g>
						</svg>
					{:else}
						<svg
							version="1.1"
							id="svg252"
							width="100%"
							height="100%"
							viewBox="0 0 64 64"
							xmlns="http://www.w3.org/2000/svg"
						>
							<defs id="defs256" />
							<g id="g258">
								<path
									class="fill-neutral-700"
									d="m 4.5180539,50.093516 c -1.3275582,-3.459561 0.533177,-6.318913 3.8093184,-5.853699 4.2727997,0.606742 4.2727997,6.913624 0,7.520366 -1.803039,0.256033 -3.3274476,-0.410932 -3.8093184,-1.666667 z M 18.666667,48 c 0,-2.548148 0.888889,-2.666667 20,-2.666667 19.11111,0 20,0.11852 20,2.666667 0,2.548148 -0.88889,2.666667 -20,2.666667 -19.111111,0 -20,-0.11852 -20,-2.666667 z M 4.5180539,34.093516 c -1.3275582,-3.459561 0.533177,-6.318913 3.8093184,-5.853699 4.2727997,0.606742 4.2727997,6.913624 0,7.520366 -1.803039,0.256033 -3.3274476,-0.410932 -3.8093184,-1.666667 z M 18.666667,32 c 0,-2.548148 0.888889,-2.666667 20,-2.666667 19.11111,0 20,0.11852 20,2.666667 0,2.548148 -0.88889,2.666667 -20,2.666667 -19.111111,0 -20,-0.11852 -20,-2.666667 z M 4.5180539,18.093516 c -1.3275582,-3.459561 0.533177,-6.318913 3.8093184,-5.853698 4.2727997,0.606741 4.2727997,6.913623 0,7.520365 -1.803039,0.256033 -3.3274476,-0.410932 -3.8093184,-1.666667 z M 18.666667,16 c 0,-2.548148 0.888889,-2.666667 20,-2.666667 19.11111,0 20,0.11852 20,2.666667 0,2.548148 -0.88889,2.666667 -20,2.666667 -19.111111,0 -20,-0.11852 -20,-2.666667 z"
									id="path264"
								/>
							</g>
						</svg>
					{/if}
				</button>
			{/if}
			{#if selectedBook}
				<div class="h-12 w-12">
					<button
						onclick={() => {
							selectedBook = undefined;
						}}
						hidden={selectedBook === undefined}
						aria-label="back to book button"
					>
						<svg
							class="h-12 w-12 p-4"
							version="1.1"
							width="34.484818"
							height="58.242714"
							viewBox="0 0 34.484818 58.242714"
							xmlns="http://www.w3.org/2000/svg"
						>
							<g id="g8" transform="translate(-40,-34.843996)">
								<path
									class="fill-neutral-700"
									style="stroke-width:1.33333"
									d="M 53,80.35758 C 43.505656,70.810684 40,66.386425 40,63.951131 c 0,-2.445847 3.49976,-6.821123 13.132229,-16.417448 11.374404,-11.331724 13.649954,-13.023883 17,-12.641652 2.904499,0.331396 3.980004,1.235166 4.318418,3.62886 0.353064,2.497337 -1.95028,5.601021 -10.637231,14.333333 L 52.725541,64 63.813416,75.145776 C 72.500367,83.878088 74.803711,86.981772 74.450647,89.479109 74.105181,91.922689 73.066399,92.755693 70,93.048101 66.510733,93.380832 64.340117,91.760465 53,80.35758 Z"
									id="path170"
								/>
							</g>
						</svg>
					</button>
				</div>
			{/if}
			<div class="flex items-center">
				{#if selectedBook}
					<h1 class=" text-center text-lg">CHAPTER</h1>
				{:else}
					<h1 class=" text-center text-lg">Book</h1>
				{/if}
			</div>
			<button
				onclick={() => {
					showBookChapterPopup = false;
				}}
				class="m-0 p-0"
			>
				Cancel
			</button>
		</div>

		{#if selectedBook === undefined}
			<div class="p-2">
				<label class="sr-only" for="name">Name</label>
				<input
					class="w-full rounded-lg border-none bg-neutral-50 p-3 text-sm outline-none"
					placeholder="Filter Books..."
					type="text"
					id="name"
					bind:value={filterText}
				/>
			</div>
		{/if}
	</header>

	{#if selectedBook}
		<div class="grid w-[100%] grid-cols-5">
			{#each new Array(bookNames['maxChapterById'][selectedBook.id]).keys() as ch}
				<button
					onclick={() => chapterSelected(ch + 1)}
					class="row-span-1 bg-neutral-50 p-4 hover:bg-primary-50">{ch + 1}</button
				>
			{/each}
		</div>
	{:else if group}
		<div class="grid w-full grid-cols-5 gap-1">
			{#each filteredBooks as bn}
				<button
					onclick={(event) => bookSelected(event, bn)}
					class="cols-span-1 align-items-center p-4 text-center hover:cursor-pointer {bookGroups[bn.id].bgcolor}  {bookGroups[bn.id].textcolor}"
				>
					{bookGroups[bn.id].name}
				</button>
			{/each}
		</div>
	{:else}
		{#each filteredBooks as bn}
			<div class="w-full">
				<button
					onclick={(event) => bookSelected(event, bn)}
					class="w-full bg-neutral-50 p-4 text-start hover:bg-primary-50 ">{bn.name}</button
				>
			</div>
		{/each}
	{/if}
</div>
