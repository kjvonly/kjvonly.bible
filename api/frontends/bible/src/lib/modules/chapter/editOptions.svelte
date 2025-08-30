<script lang="ts">
	import { annotsApi } from '$lib/api/annots.api';
	import { onMount } from 'svelte';

	let { mode = $bindable(), annotations = $bindable() } = $props();

	onMount(() => {
		mode.colorAnnotation = 'bg-highlighta';
		mode.type = 'bg';
	});

	let selectedColor = $state('a');
	let selectedAnnotation = $state('bg');
	let selectedType = $state(1);

	let underlineColor = $state(5);
	let textColor = $state(5);
	let highlighterColor = $state(0);

	function onSelectColor(color: string) {
		selectedColor = color;
		onType(selectedType);
		updateColorAnnotation();
	}

	async function onSave() {
		let resp = await annotsApi.putAnnotations(JSON.parse(JSON.stringify(annotations)));
		if(resp !== undefined) {
			annotations.version = resp.version
			annotations = resp
		}
		mode.value = '';
	}

	async function onClose() {
		let data = await annotsApi.getAnnotations(annotations.id);
		annotations = data;
		mode.value = '';
	}

	function updateColorAnnotation() {
		mode.colorAnnotation = selectedAnnotation + '-highlight' + selectedColor;
	}

	function onType(index: number) {
		for (let i = 0; i < fill.length; i++) {
			if (i == index) {
				fill[i] = 'fill-highlight' + selectedColor;
				selectedType = index;
				selectedAnnotation = types[index];
				mode.type = selectedAnnotation;
				updateColorAnnotation();
			} else {
				fill[i] = 'fill-neutral-700';
			}
		}

		textColor = fills.indexOf(fill[0]);
		highlighterColor = fills.indexOf(fill[1]);
		underlineColor = fills.indexOf(fill[2]);
	}

	let fill = ['fill-neutral-700', 'fill-highlighta', 'fill-neutral-700'];
	let fills = [
		'fill-highlighta',
		'fill-highlightb',
		'fill-highlightc',
		'fill-highlightd',
		'fill-highlighte',
		'fill-neutral-700'
	];
	let types = ['text', 'bg', 'decoration'];
</script>

<div class="flex h-24 w-full flex-col items-center space-x-3 border bg-neutral-50 px-2 py-1">
	<div class="absolute right-1">
		<button onclick={onClose} aria-label="save" class="h-8 w-8">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
				<path
					class="fill-neutral-700"
					d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
				/>
			</svg>
		</button>
	</div>
	<div class="space-x-3">
		<button
			onclick={() => {
				onSelectColor('a');
			}}
			aria-label="color-a"
			class="h-8 w-8 rounded-full bg-highlighta {selectedColor === 'a'
				? 'ring-2 ring-neutral-700'
				: ''}"
		></button>
		<button
			onclick={() => {
				onSelectColor('b');
			}}
			aria-label="color-b"
			class="h-8 w-8 rounded-full bg-highlightb {selectedColor === 'b'
				? 'ring-2 ring-neutral-700'
				: ''}"
		></button>
		<button
			onclick={() => {
				onSelectColor('c');
			}}
			aria-label="color-c"
			class="h-8 w-8 rounded-full bg-highlightc {selectedColor === 'c'
				? 'ring-2 ring-neutral-700'
				: ''}"
		></button>
		<button
			onclick={() => {
				onSelectColor('d');
			}}
			aria-label="color-d"
			class="h-8 w-8 rounded-full bg-highlightd {selectedColor === 'd'
				? 'ring-2 ring-neutral-700'
				: ''}"
		></button>
		<button
			onclick={() => {
				onSelectColor('e');
			}}
			aria-label="color-e"
			class="h-8 w-8 rounded-full bg-highlighte {selectedColor === 'e'
				? 'ring-2 ring-neutral-700'
				: ''}"
		></button>
	</div>
	<div class="space-x-3">
		<button
			onclick={() => {
				onSave()
				mode.notePopup.show = true;
				mode.notePopup.chapterKey = mode.chapterKey;
				mode.value = '';
			}}
			aria-label="note"
			class="h-8 w-8"
		>
			<svg
				version="1.1"
				id="svg798"
				width="100%"
				height="100%"
				viewBox="0 0 96 96"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g804" transform="translate(-16,-16)">
					<path
						class="fill-neutral-700"
						style="stroke-width:1.33333"
						d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 H 64 105.45455 l 3.27272,3.272727 C 111.99725,22.542709 112,22.569285 112,50.959401 V 79.373349 L 95.647413,95.686675 79.294825,112 H 50.92014 c -28.348432,0 -28.377713,-0.003 -31.647413,-3.27273 z M 74.666667,88 V 74.666667 H 88 101.33333 v -24 -24 H 64 26.666667 V 64 101.33333 h 24 24 z M 37.333333,64 V 58.666667 H 50.666667 64 V 64 69.333333 H 50.666667 37.333333 Z m 0,-21.333333 V 37.333333 H 64 90.666667 V 42.666667 48 H 64 37.333333 Z"
						id="path925"
					/>
				</g>
			</svg>
		</button>

		<button
			onclick={() => {
				onType(0);
			}}
			aria-label="color-a"
			class="h-8 w-8 {'ring-highlight' + selectedColor} rouded-full"
		>
			<svg
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 85.333336 96"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g654" transform="translate(-21.333333,-16)">
					<path
						class={fills[textColor]}
						style="stroke-width:1.33333"
						d="m 48,106.66667 v -5.33334 h 5.333333 5.333334 V 64 26.666667 H 45.333333 32 V 32 37.333333 H 26.666667 21.333333 V 26.666667 16 H 64 106.66667 V 26.666667 37.333333 H 101.33333 96 V 32 26.666667 H 82.666667 69.333333 V 64 101.33333 H 74.666667 80 V 106.66667 112 H 64 48 Z"
						id="path775"
					/>
				</g>
			</svg>
		</button>

		<button
			onclick={() => {
				onType(1);
			}}
			aria-label="color-a"
			class="h-8 w-8 {'ring-highlight' + selectedColor} rouded-full"
		>
			<svg
				class=""
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 106.44316 102.08302"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g354" transform="translate(-10.582809,-11.007537)">
					<path
						class={fills[highlighterColor]}
						style="stroke-width:1.33333"
						d="m 17.624737,109.56005 -7.041928,-3.64747 3.772671,-3.61444 3.772671,-3.614452 5.610614,5.716802 c 4.379363,4.46224 5.257734,6.06968 4.002591,7.32482 -2.068111,2.06811 -1.85582,2.11355 -10.116619,-2.16526 z m 31.817166,-4.76257 c -2.280786,-2.74817 -7.410176,-3.66367 -11.600587,-2.07048 -3.329411,1.26584 -4.163505,0.91159 -8.821708,-3.746608 -4.658203,-4.658203 -5.012445,-5.492297 -3.746607,-8.821708 1.593192,-4.190411 0.677692,-9.319801 -2.070485,-11.600587 -2.984575,-2.476977 -2.193788,-5.720366 2.505137,-10.274744 l 4.37432,-4.239758 16.986019,17.023806 16.986017,17.023807 -4.423814,4.287732 c -4.791455,4.64406 -7.757027,5.34804 -10.188292,2.41854 z M 54.321531,73.642925 37.395579,56.666667 66.544992,33.837101 95.694405,11.007537 106.36019,21.673317 117.02597,32.339099 94.999115,60.502883 c -12.114768,15.490081 -22.414928,28.6031 -22.889243,29.140042 -0.474315,0.536943 -8.479068,-6.663057 -17.788341,-16 z"
						id="path475"
					/>
				</g>
			</svg>
		</button>

		<button
			onclick={() => {
				onType(2);
			}}
			aria-label="color-a"
			class="h-8 w-8"
		>
			<svg
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 64 106.66666"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g504" transform="translate(-32,-10.666667)">
					<path
						class={fills[underlineColor]}
						style="stroke-width:1.33333"
						d="m 32,112 v -5.33333 H 64 96 V 112 117.33333 H 64 32 Z M 51.333333,92.822279 C 43.320797,89.034348 38.421883,84.057477 34.774551,76 32.306672,70.548101 32.055891,67.289941 32.029283,40.333333 L 32,10.666667 h 5.263653 5.263654 l 0.403013,30.572578 c 0.442683,33.581879 0.520475,33.91209 9.583172,40.67837 5.16292,3.854676 17.810096,3.854676 22.973016,0 9.062697,-6.76628 9.140489,-7.096491 9.583172,-40.67837 L 85.472693,10.666667 H 90.736347 96 L 95.98698,40.333333 C 95.97451,68.738613 95.83995,70.283457 92.822284,76.666667 84.960028,93.297543 67.072372,100.26292 51.333338,92.822279 Z"
						id="path625"
					/>
				</g>
			</svg>
		</button>
		<button onclick={onSave} aria-label="save" class="h-8 w-8">
			<svg width="100%" height="100%" viewBox="0 0 96.130432 96" xmlns="http://www.w3.org/2000/svg">
				<g id="g8" transform="translate(-16,-16)">
					<path
						class="fill-neutral-700"
						style="stroke-width:1.33333"
						d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 h 33.641558 33.641559 l 11.150928,11.150928 11.15093,11.150928 -0.39855,34.302125 c -0.3976,34.220589 -0.40603,34.308179 -3.54626,36.849069 C 105.2389,111.83737 102.4042,112 63.791681,112 H 22.545455 Z m 55.9361,-12.654045 c 3.502058,-3.50206 4.124506,-5.122865 4.124506,-10.739892 0,-5.693716 -0.607301,-7.222686 -4.358974,-10.974358 C 71.222687,70.607301 69.693716,70 64,70 c -5.693716,0 -7.222687,0.607301 -10.974359,4.358975 -3.737012,3.73701 -4.358974,5.291226 -4.358974,10.892581 0,6.853933 3.398442,12.271284 9.333333,14.877974 4.985283,2.1896 12.806448,0.34607 17.208827,-4.056305 z M 78.4,46.4 c 2.077387,-2.077387 2.077387,-16.055947 0,-18.133333 -2.250848,-2.250848 -47.882485,-2.250848 -50.133333,0 -2.077387,2.077386 -2.077387,16.055946 0,18.133333 2.250848,2.250848 47.882485,2.250848 50.133333,0 z"
						id="path293"
					/>
				</g>
			</svg>
		</button>
	</div>
</div>

<!-- typescript will optimize these out if not used. Must keep them in dom -->

<span class="hidded text-highlighta"></span>
<span class="hidded text-highlightb"></span>
<span class="hidded text-highlightc"></span>
<span class="hidded text-highlightd"></span>
<span class="hidded text-highlighte"></span>

<span class="hidded underline decoration-highlighta"></span>
<span class="hidded underline decoration-highlightb"></span>
<span class="hidded underline decoration-highlightc"></span>
<span class="hidded underline decoration-highlightd"></span>
<span class="hidded underline decoration-highlighte"></span>
