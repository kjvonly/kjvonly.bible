import type { BCV } from '$lib/models/bible.model';
import type { Readings } from '$lib/models/plans.model';
import { bookNamesByIDService } from '../bibleMetadata/bookNamesByID.service';

/**
 * {@link CachedPlan.readings} are stored encoded in the backend. This service decodes the
 * plan {@link CachedPlan.readings}[] (a string[]) to {@link Readings}[] that include an
 * array of {@link BCV}[]
 * (i.e. book chapter verses) that contain all grouped readings a user would
 * read in together in sequence.
 *
 * Decoded {@link Readings}[0] at index 0 and * Decoded {@link Readings}[1] at
 * index 1:
 *
 * @example
 * M'Cheyne Reading Plan. Readings one and two
 * [
 *  "1/1/1-31;47/1/1-25;15/1/1-11;51/1/1-26",
 *  "1/2/1-25;47/2/1-23;15/2/1-70;51/2/1-47"
 * ]
 *
 *
 * {
 *  "bcvs": [
 *    {
 *      "bookName": "Genesis",
 *      "bookID": 1,
 *      "chapter": 1,
 *      "verses": "1-31",
 *      "bibleLocationRef": "1_1_1-31"
 *    },
 *    {
 *      "bookName": "Matthew",
 *      "bookID": 47,
 *      "chapter": 1,
 *      "verses": "1-25",
 *      "bibleLocationRef": "47_1_1-25"
 *    },
 *    {
 *      "bookName": "Ezra",
 *      "bookID": 15,
 *      "chapter": 1,
 *      "verses": "1-11",
 *      "bibleLocationRef": "15_1_1-11"
 *    },
 *    {
 *      "bookName": "Acts",
 *      "bookID": 51,
 *      "chapter": 1,
 *      "verses": "1-26",
 *      "bibleLocationRef": "51_1_1-26"
 *    }
 *  ],
 *  "totalVerses": 93
 * }
 *
 *
 * {
 *   "bcvs": [
 *     {
 *       "bookName": "Genesis",
 *       "bookID": 1,
 *       "chapter": 2,
 *       "verses": "1-25",
 *       "bibleLocationRef": "1_2_1-25"
 *     },
 *     {
 *       "bookName": "Matthew",
 *       "bookID": 47,
 *       "chapter": 2,
 *       "verses": "1-23",
 *       "bibleLocationRef": "47_2_1-23"
 *     },
 *     {
 *       "bookName": "Ezra",
 *       "bookID": 15,
 *       "chapter": 2,
 *       "verses": "1-70",
 *       "bibleLocationRef": "15_2_1-70"
 *     },
 *     {
 *       "bookName": "Acts",
 *       "bookID": 51,
 *       "chapter": 2,
 *       "verses": "1-47",
 *       "bibleLocationRef": "51_2_1-47"
 *     }
 *   ],
 *   "totalVerses": 165
 * }
 *
 *
 *
 * */
export class EncodedReadingsDecoderService {
	/**
	 *	Loops through all encoded readings decoding them and setting
	 *  total verses.
	 *
	 *	encoded readings example: 1/1/1-31;47/1/1-25;15/1/1-11;51/1/1-26
	 *
	 * @param encodedReadings
	 * @returns list of {@link Readings}[]
	 *
	 */
	parseEncodedReadings(encodedReadings: string[]): Readings[] {
		return encodedReadings.map((ers: string) => {
			let bcvs = this.decodeReadings(ers);
			return {
				bcvs: bcvs,
				totalVerses: this.setTotalVerses(bcvs)
			};
		});
	}

	/**
	 * Decodes each readings
	 *
	 * @param encodedReadings  semicolon delimited string of readings
	 * @returns decoded readings as {@link BCV}[]
	 */
	decodeReadings(encodedReadings: string): BCV[] {
		return encodedReadings.split(';').map((r) => {
			let bcv = r.split('/');
			return {
				bookName: bookNamesByIDService.get(bcv[0]),
				bookID: parseInt(bcv[0]),
				chapter: parseInt(bcv[1]),
				verses: bcv[2],
				bibleLocationRef: r.replaceAll('/', '_')
			};
		});
	}

	/**
	 * Sums the verses in each reading.
	 *
	 * @param sub subscription
	 */
	setTotalVerses(bcvs: BCV[]) {
		return bcvs
			.map((b) => this.sumVerseRange(b.verses))
			.reduce((a, b) => a + b);
	}

	/**
	 * A verse range is made up of a start verse hyphen end verse.
	 * Sum verse range sums the verses in the range.
	 *
	 * E.g. 1-2 is 2 verses, 1-10 is 10 verses, 2-5 is 4 verses etc...
	 *
	 * @param rng a verse group
	 * @returns total number of verses in readings
	 */
	sumVerseRange(rng: string): number {
		let [start, end] = this.parseVerseRange(rng);

		if (start + end === 0) {
			return 0;
		}

		const includeStartAndEndVerse = 1;
		return end - start + includeStartAndEndVerse;
	}

	/**
	 * Parse start and end verse.
	 *
	 *
	 * @param rng start and end verse e.g. 1-31
	 * @returns parsed start and end index in array.
	 *          [0,0] if unable to parse start or end index.
	 */
	parseVerseRange(rng: string): number[] {
		let startEndVerses = rng.split('-');
		let start = parseInt(startEndVerses[0], 10);
		let end = parseInt(startEndVerses[1], 10);

		if (Number.isNaN(start) || Number.isNaN(end)) {
			start = 0;
			end = 0;
		}

		return [start, end];
	}
}

/**
 * Service for decoding the encoded plans readings. {@link EncodedReadingsDecoderService}
 */
export const encodedReadingsDecoderService =
	new EncodedReadingsDecoderService();
