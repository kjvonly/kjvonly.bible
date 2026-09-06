import { Clock } from "../../ports/time/clock.js";

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