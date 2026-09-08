<script lang="ts">
	import uuid4 from 'uuid4';

	let {
		isToggled = $bindable<boolean>(),
		onChange
	}: {
		isToggled: boolean;
		onChange: (e: Event) => void;
	} = $props();

	let ID = uuid4();
</script>

<label
	for={ID}
	class="has-checked:bg-support-a-600 relative block h-8 max-w-14 min-w-14 rounded-full bg-neutral-300 transition-colors [-webkit-tap-highlight-color:_transparent] hover:cursor-pointer"
>
	<input
		bind:checked={isToggled}
		onchange={onChange}
		type="checkbox"
		id={ID}
		class="peer sr-only"
	/>

	<span
		class="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-neutral-100 transition-[inset-inline-start] peer-checked:start-6"
	></span>
</label>
