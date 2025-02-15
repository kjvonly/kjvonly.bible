<script lang="ts">
	let { mode = $bindable() } = $props();
	let selectedColor = $state('a');
	let selectAnnotation = $state('bg');
	function onSelectColor(color: string) {
		mode.colorAnnotation = 'bg-highlight' + color;
		selectedColor = color;
	}

	let fill = [
		'fill-highlighta',
		'fill-highlightb',
		'fill-highlightc',
		'fill-highlightd',
		'fill-highlighte'
	];
</script>

<div class="flex h-24 w-full flex-col items-center space-x-3 bg-neutral-100 px-2 py-1">
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
				//onSelectColor('bg');
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
						class="{fill[selectedColor.charCodeAt(0) - 97]}"
						style="stroke-width:1.33333"
						d="m 17.624737,109.56005 -7.041928,-3.64747 3.772671,-3.61444 3.772671,-3.614452 5.610614,5.716802 c 4.379363,4.46224 5.257734,6.06968 4.002591,7.32482 -2.068111,2.06811 -1.85582,2.11355 -10.116619,-2.16526 z m 31.817166,-4.76257 c -2.280786,-2.74817 -7.410176,-3.66367 -11.600587,-2.07048 -3.329411,1.26584 -4.163505,0.91159 -8.821708,-3.746608 -4.658203,-4.658203 -5.012445,-5.492297 -3.746607,-8.821708 1.593192,-4.190411 0.677692,-9.319801 -2.070485,-11.600587 -2.984575,-2.476977 -2.193788,-5.720366 2.505137,-10.274744 l 4.37432,-4.239758 16.986019,17.023806 16.986017,17.023807 -4.423814,4.287732 c -4.791455,4.64406 -7.757027,5.34804 -10.188292,2.41854 z M 54.321531,73.642925 37.395579,56.666667 66.544992,33.837101 95.694405,11.007537 106.36019,21.673317 117.02597,32.339099 94.999115,60.502883 c -12.114768,15.490081 -22.414928,28.6031 -22.889243,29.140042 -0.474315,0.536943 -8.479068,-6.663057 -17.788341,-16 z"
						id="path475"
					/>
				</g>
			</svg>
		</button>
		<button aria-label="save" class="h-8 w-8">
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
