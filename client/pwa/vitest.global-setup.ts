import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

const pwaDirectory = fileURLToPath(new URL('.', import.meta.url));

/** Build local workspace packages before tests load their compiled exports. */
function buildWorkspacePackages(): void {
	execFileSync('npm', ['run', 'prebuild'], {
		cwd: pwaDirectory,
		stdio: 'inherit'
	});
}

export default function setup(project: TestProject): void {
	buildWorkspacePackages();
	// VS Code keeps Vitest running; its Run button triggers a rerun, not a new setup.
	project.onTestsRerun(buildWorkspacePackages);
}
