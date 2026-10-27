import type { NormalizedDocument } from '@kjvonly/normalized-content';

/** Reader-local actions for retrieving one selected Resource descriptor. */
export interface NormalizedReaderDocumentLoadSteps {
	/** Is this still the currently selected document identity? */
	readonly isCurrent: () => boolean;
	readonly retrieve: () => Promise<NormalizedDocument>;
	readonly accept: (document: NormalizedDocument) => void;
	readonly reportError: (error: unknown) => void;
	readonly complete: () => Promise<void> | void;
}

/** Retrieve, accept, and complete a load for the currently selected document. */
export async function retrieveAndCompleteNormalizedReaderDocument(
	steps: NormalizedReaderDocumentLoadSteps
): Promise<void> {
	try {
		const loaded = await steps.retrieve();
		if (steps.isCurrent()) steps.accept(loaded);
	} catch (error) {
		if (steps.isCurrent()) steps.reportError(error);
	} finally {
		if (steps.isCurrent()) await steps.complete();
	}
}
