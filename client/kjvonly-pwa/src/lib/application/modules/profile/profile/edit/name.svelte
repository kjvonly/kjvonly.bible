<script lang="ts">
	let {
		name = $bindable('')
	}: {
		name: string;
	} = $props();
</script>

<div class="w-full">
	<p class="capitalize underline">name</p>
	<input
		bind:value={name}
		class="w-full p-2 outline outline-neutral-400"
		type="text"
		aria-label="profile name"
	/>
</div>
