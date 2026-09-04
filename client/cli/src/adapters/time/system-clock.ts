import type {
	Clock
} from '../../ports/clock.js';


export class SystemClock
	implements Clock {

	nowEpochSeconds():
		number {

		return Math.floor(
			Date.now() /
				1000
		);
	}
}