import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
	server:
		command === 'serve'
			? {
					host: '0.0.0.0',
					//strictPort: true,
					https: {
						key: fs.readFileSync('./.certs/app.local.key'),
						cert: fs.readFileSync('./.certs/app.local.crt')
					},
					hmr: {
						protocol: 'wss',
						host: 'app.local',
						port: 5173
					}
				}
			: undefined,
	plugins: [tailwindcss(), sveltekit()],
	build: {
		target: 'es2022'
	},
	worker: {
		format: 'es'
	}
}));
