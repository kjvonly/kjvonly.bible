<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(()=> {
        goto('/')
    });

	let { children } = $props();
    
    
</script>

{@render children?.()}
