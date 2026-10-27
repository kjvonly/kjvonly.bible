import type {
	NormalizedContentAddress
} from '../../models/normalized-content-address.model';

/**
 * Handles an ordinary activation of one canonical normalized word.
 *
 * Returning true means the host consumed the activation and any linked-word
 * navigation should not continue. Returning false allows normal link handling
 * to proceed.
 *
 * @param address Exact `blockId + contentIndex` address of the activated word.
 * @returns True when the host consumed the activation; otherwise false.
 */
export type NormalizedContentWordActivationHandler = (
	address: NormalizedContentAddress
) => boolean;
