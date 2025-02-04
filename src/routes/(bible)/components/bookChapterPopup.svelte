<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let {
		chapterKey = $bindable(),
		showBookChapterPopup = $bindable(),
		bookName,
		bookChapter,
		containerHeight
	} = $props();
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

	function onBookChapterClick(event) {
		event.stopPropagation();
		console.log('stop', event);
		showBookChapterPopup = !showBookChapterPopup;
	}
</script>

<!-- book chapter selection -->

	<div class="leading-tight ">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="flex items-center
		justify-between rounded-e-full rounded-s-full bg-neutral-100 px-1 text-neutral-700 hover:cursor-pointer"
		>
			<svg
				fill="fill-neutral-700"
				class="ml-2 h-5 w-5"
				version="1.1"
				viewBox="0 0 101.19472 102.47694"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs id="defs6" />
				<g id="g8" transform="translate(-14.22569,-5.0803528)">
					<path
						class="fill-neutral-700"
						d="m 63.982806,107.25953 c -1.14748,-0.60402 -2.237679,-2.85538 -3.122006,-6.44723 -0.262172,-1.064862 -0.615964,-2.209132 -0.786202,-2.542822 -0.722372,-1.41597 -2.022094,-2.03216 -5.546573,-2.62961 -3.911473,-0.66305 -5.328164,-0.32474 -7.044869,1.68235 -2.778907,3.248982 -4.030012,4.203262 -5.510636,4.203262 -1.778664,0 -3.90234,-2.303562 -3.908432,-4.239492 -0.0027,-0.84855 0.357058,-2.38479 1.195396,-5.105013 1.121996,-3.64063 0.869387,-4.542175 -2.102324,-7.503106 -2.227249,-2.219168 -3.004278,-2.635636 -4.686809,-2.51201 -0.734968,0.054 -2.097847,0.372904 -3.623854,0.847948 -3.014557,0.938429 -4.410573,1.09351 -5.501123,0.611108 -0.979475,-0.433269 -2.14127,-1.513992 -2.562102,-2.383316 -0.906057,-1.871663 -0.137354,-3.223692 3.804254,-6.691093 2.133077,-1.876451 2.441682,-3.149332 1.744788,-7.196584 C 25.821745,64.38876 25.53018,63.545258 24.710684,62.662512 24.059658,61.96124 23.521355,61.742128 20.817817,61.077958 17.949394,60.373281 16.541488,59.769371 15.474754,58.78609 14.53596,57.920739 14.22569,57.337997 14.22569,56.440127 c 0,-0.89787 0.31027,-1.480613 1.249064,-2.345963 1.06683,-0.983368 2.459904,-1.580358 5.335753,-2.286587 3.379879,-0.830006 3.921228,-1.145018 4.62278,-2.689996 0.530115,-1.167435 1.061246,-3.930394 1.166357,-6.067422 0.08301,-1.687714 0.06114,-1.874108 -0.316669,-2.699362 -0.300831,-0.657102 -0.738913,-1.179485 -1.693132,-2.01895 -3.188718,-2.805238 -4.140799,-4.040401 -4.140799,-5.371974 0,-1.325594 1.312113,-3.003759 2.896553,-3.704631 1.06896,-0.472852 2.480515,-0.316826 5.507395,0.608764 4.558113,1.393826 5.140517,1.263245 8.254522,-1.850759 2.37756,-2.37756 2.84151,-3.221122 2.694494,-4.899171 -0.05199,-0.593474 -0.352008,-1.886179 -0.666694,-2.872675 -1.135537,-3.559749 -1.301773,-4.868218 -0.767833,-6.043781 0.704298,-1.55064 2.342954,-2.842844 3.605039,-2.842844 1.484819,0 2.602211,0.847605 5.430989,4.119712 0.520752,0.602365 1.291197,1.297648 1.712102,1.545073 0.717891,0.422008 0.881397,0.449488 2.64044,0.443773 2.324186,-0.0076 5.209755,-0.537893 6.603821,-1.213723 1.525845,-0.739714 1.789501,-1.246401 2.740935,-5.267476 0.943471,-3.9874086 3.00303,-6.3778136 5.01617,-5.8219586 1.836813,0.507168 3.21401,2.721696 4.079381,6.5596326 0.263826,1.17007 0.612995,2.428769 0.77593,2.797108 0.648391,1.465775 1.974128,2.114176 5.568476,2.723469 2.505055,0.424642 4.315899,0.374773 5.326242,-0.14668 0.373508,-0.192773 1.180642,-0.920856 1.79363,-1.617962 2.818373,-3.205126 4.021131,-4.120968 5.41199,-4.120968 0.919156,0 1.742925,0.44623 2.68701,1.455533 1.629727,1.74231 1.657819,2.857621 0.18923,7.51262 -0.747362,2.368918 -0.888987,3.780107 -0.486516,4.847743 0.419653,1.113213 4.225647,4.920861 5.33775,5.340069 1.079386,0.406875 2.531258,0.270642 4.85149,-0.455227 4.65881,-1.457477 5.75516,-1.44153 7.451,0.108376 2.27789,2.081864 2.04704,3.922536 -0.81633,6.508756 -2.93367,2.649724 -3.33098,3.10218 -3.63132,4.135284 -0.34449,1.185016 -0.2419,3.067127 0.31447,5.76944 0.74413,3.614206 1.43786,4.287057 5.5483,5.381351 4.14478,1.103437 4.9027,1.796228 4.9027,4.481406 0,2.677682 -0.76125,3.376858 -4.88219,4.484076 -3.14985,0.846302 -4.10375,1.40739 -4.84747,2.851292 -0.44393,0.86189 -1.08511,4.018853 -1.21152,5.965242 -0.17581,2.706882 0.0286,3.054199 3.80703,6.466872 2.87727,2.59878 3.09653,4.424782 0.78499,6.537402 -1.59165,1.454676 -2.81596,1.500337 -6.84896,0.255437 -2.90743,-0.897463 -4.288729,-1.058191 -5.42219,-0.630934 -1.112103,0.419207 -4.918097,4.226855 -5.33775,5.340069 -0.402471,1.067635 -0.260846,2.478825 0.486516,4.847741 1.103006,3.496204 1.302704,4.975194 0.825864,6.116434 -0.311394,0.74527 -1.643088,2.152672 -2.404349,2.541042 -0.334939,0.17087 -0.91893,0.31068 -1.297755,0.31068 -1.390859,0 -2.593617,-0.91584 -5.41199,-4.120972 -0.612988,-0.6971 -1.420122,-1.42467 -1.79363,-1.61682 -1.001784,-0.51535 -2.681172,-0.56163 -5.244713,-0.14452 -3.667999,0.59683 -4.994298,1.23785 -5.655971,2.73366 -0.166218,0.37575 -0.48371,1.51308 -0.705538,2.527392 -1.037182,4.74249 -3.878214,7.61852 -6.277978,6.35531 z m 7.993353,-17.713094 c 4.144861,-0.486083 6.632164,-1.428238 11.413013,-4.323091 5.141981,-3.113523 7.168641,-5.213226 7.172929,-7.431458 0.0043,-2.197887 -2.085681,-4.33093 -7.474034,-7.628213 -5.291126,-3.237787 -6.088434,-3.390525 -10.216093,-1.95705 -5.926635,2.05823 -5.380171,1.91593 -7.337579,1.910719 -1.93847,-0.0052 -1.93193,-0.0035 -7.134696,-1.847515 -3.862128,-1.368879 -4.991232,-1.145023 -10.377449,2.057436 -3.398757,2.020784 -6.460222,4.495769 -7.333922,5.928977 -0.472483,0.775057 -0.456442,1.956001 0.04091,3.011911 1.012848,2.150333 4.090554,4.559522 9.156246,7.167387 3.291923,1.694714 6.502641,2.583688 11.166182,3.091658 2.80485,0.305516 8.399392,0.315368 10.924492,0.01924 z M 37.656839,68.039389 c 1.355691,-0.361043 3.920521,-1.523092 6.598575,-2.98962 4.032435,-2.208199 5.484112,-3.406186 6.307884,-5.205538 0.22473,-0.49088 0.621405,-1.933008 0.881497,-3.204732 0.591527,-2.892275 0.824469,-3.615524 1.705021,-5.293811 0.950202,-1.811036 1.769491,-2.837367 4.263743,-5.34123 2.313551,-2.322463 3.026728,-3.254698 3.482968,-4.552781 0.571792,-1.626849 0.660562,-2.893925 0.75772,-10.815371 l 0.09649,-7.867516 h -0.339422 c -0.621834,0 -5.88198,1.139463 -7.238808,1.568085 -2.890802,0.913204 -5.961537,2.509155 -8.619021,4.47956 -1.671606,1.23942 -4.401683,3.865859 -5.747617,5.529425 -3.861948,4.77335 -6.407652,10.68216 -7.205389,16.724365 -0.540912,4.096972 -0.462199,11.955805 0.142295,14.20693 0.320899,1.195026 0.902914,2.175927 1.549487,2.611439 0.654278,0.440699 2.0424,0.502914 3.364573,0.150795 z m 58.332967,0.04953 c 1.367161,-0.379663 2.24031,-1.713121 2.659262,-4.061178 0.267387,-1.498611 0.303148,-7.763813 0.06239,-10.930291 -1.00267,-13.187003 -9.585256,-24.661997 -21.403455,-28.616614 -1.457909,-0.487848 -6.864922,-1.712048 -7.56172,-1.712048 -0.177475,0 -0.216979,1.373825 -0.216979,7.545678 0,7.822094 0.107743,9.631686 0.661607,11.112023 0.5096,1.362025 1.133204,2.16648 3.624709,4.675894 3.772031,3.79915 4.880349,5.773485 5.808855,10.347778 0.977855,4.817408 2.014184,5.95074 8.585389,9.388992 3.845655,2.012164 6.192133,2.690705 7.779947,2.249766 z"
					/>
				</g>
			</svg>

			<span class="ml-2 h-[100%] border-s-2 border-neutral-300">&nbsp;</span>
			<span
				onclick={(e) => {
					onBookChapterClick(e);
				}}
				class="m-0 text-center font-bold text-neutral-700 md:text-base lg:text-lg"
			>
				<span>{bookName} {bookChapter}<span> </span></span>
			</span>
			<span class="mr-2 h-[100%] border-e-2 border-neutral-300">&nbsp;</span>

			<span onclick={alert('hi')}>
				<svg
					fill="fill-neutral-700"
					class="mr-2 h-5 w-5"
					viewBox="0 0 25.4 14.098638"
					version="1.1"
					id="svg5"
					xml:space="preserve"
					xmlns="http://www.w3.org/2000/svg"
					><defs id="defs2" /><g id="layer1" transform="translate(-53.644677,-127.79211)"
						><path
							class="fill-neutral-700"
							d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
							id="path179"
						/></g
					></svg
				>
			</span>
		</span>
	</div>
	<div
	style="{containerHeight}"
		class="absolute   {showBookChapterPopup
			? ''
			: 'hidden'} z-[10000]  w-full  bg-white shadow-lg"
	>
	
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
							class="cols-span-1 align-items-center p-4 text-center hover:cursor-pointer {bookGroups[
								bn.id
							].bgcolor}  {bookGroups[bn.id].textcolor}"
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
							class="w-full bg-neutral-50 p-4 text-start hover:bg-primary-50">{bn.name}</button
						>
					</div>
				{/each}
			{/if}
		</div>
	</div>

