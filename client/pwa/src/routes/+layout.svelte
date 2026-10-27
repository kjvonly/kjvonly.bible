<script lang="ts">
	import '../app.css';
	import '../../../node_modules/quill/dist/quill.snow.css';

	import { onMount } from 'svelte';

	import Container from '$lib/components/container.svelte';
	import {
		createApplicationConfig,
		provideApplicationContext
	} from '$lib/application';
	/*
	 * Application is the concrete composition root. Keep this direct import at
	 * the application bootstrap boundary; runtime consumers should use the
	 * public Application APIs or ApplicationContext instead.
	 */
	import { Application } from '$lib/application/runtime/application';

	const application = new Application(createApplicationConfig());

	provideApplicationContext(application.context);

	let ready = $state(false);
	let startupError: unknown = $state();

	async function requestPersistentStorage(): Promise<void> {
		if (!navigator.storage?.persist) {
			return;
		}

		const persisted = await navigator.storage.persisted();
		if (persisted) {
			return;
		}

		await navigator.storage.persist();
	}

	onMount(() => {
		let disposed = false;

		const start = async () => {
			try {
				void requestPersistentStorage();

				await application.context.authenticationService.tryLogin();
				await application.start();

				if (!disposed) {
					ready = true;
				}
			} catch (error) {
				if (!disposed) {
					startupError = error;
				}
			}
		};

		void start();

		return () => {
			disposed = true;
			void application.stop();
		};
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

<Container>
	{#if ready}
		{@render children?.()}
	{:else if startupError}
		<div>Application startup failed.</div>
	{:else}
		<div>Loading...</div>
	{/if}
</Container>
