<script lang="ts">
	// CSS
	import '../app.css';
	import '../../../node_modules/quill/dist/quill.snow.css';

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import Container from '$lib/components/container.svelte';

	// APPLICATION START
	import {
		Application
	} from '$lib/application/runtime/application';

	import {
		provideApplicationContext
	} from '$lib/application/runtime/application-context';

	import {
		createApplicationConfig
	} from '$lib/application/config/application.config';

	const application =
	new Application(
		createApplicationConfig()
	);

provideApplicationContext(
	application.context
);

let applicationReady =
	$state(false);

let applicationStartupError =
	$state<unknown>();


	function register() {
		// Listen for connection coming online
		window.addEventListener('online', () => {
			
			console.log('Network connection restored.');
		});

		// Listen for connection going offline
		window.addEventListener('offline', () => {
			console.log('Network connection lost.');
			// Show offline message or queue requests
		});

		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				console.log('Page is now visible (returned to foreground)');
			}
		});
	}


	let ready =
	$state(false);

let startupError:
	unknown =
		$state();

onMount(() => {
	let disposed =
		false;

	const start =
		async () => {
			try {
				await application.context
					.authenticationService
					.tryLogin();

				await application.start();

				if (!disposed) {
					ready =
						true;
				}
			} catch (error) {
				if (!disposed) {
					startupError =
						error;
				}
			}
		};

	void start();

	return () => {
		disposed =
			true;

		void application.stop();
	};
});

	let { children } = $props();
</script>

<Container>
	{#if ready}
		{@render children?.()}
	{:else if startupError}
		<div>
			Application startup failed.
		</div>
	{:else}
	<div>
		Loading...
	</div>
	{/if}
</Container>