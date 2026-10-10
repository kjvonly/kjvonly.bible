<script lang="ts">
	import {
		KJVPressHoldButton
	} from '$lib/components';

	let presses = $state(0);
	let holds = $state(0);
</script>

<KJVPressHoldButton
	label="test press hold"
	onClick={() => (presses += 1)}
	onHold={() => (holds += 1)}
	holdDurationMs={100}
	progressDelayMs={20}
>
	<span aria-hidden="true">test</span>
</KJVPressHoldButton>

<span data-presses>{presses}</span>
<span data-holds>{holds}</span>
