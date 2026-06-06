import type { BookGrouping } from '$lib/models/bible.model';

export class BookGroupingsService {
	bookGroups: { [bookID: string]: BookGrouping } = {
		'1': {
			name: 'Gen',
			group: 'law'
		},
		'2': {
			name: 'Exo',
			group: 'law'
		},
		'3': {
			name: 'Lev',
			group: 'law'
		},
		'4': {
			name: 'Num',
			group: 'law'
		},
		'5': {
			name: 'Deu',
			group: 'law'
		},
		'6': {
			name: 'Jos',
			group: 'history'
		},
		'7': {
			name: 'Jud',
			group: 'history'
		},
		'8': {
			name: 'Rut',
			group: 'history'
		},
		'9': {
			name: '1Sa',
			group: 'history'
		},
		'10': {
			name: '2Sa',
			group: 'history'
		},
		'11': {
			name: '1Ki',
			group: 'history'
		},
		'12': {
			name: '2Ki',
			group: 'history'
		},
		'13': {
			name: '1Ch',
			group: 'history'
		},
		'14': {
			name: '2Ch',
			group: 'history'
		},
		'15': {
			name: 'Ezr',
			group: 'history'
		},
		'16': {
			name: 'Neh',
			group: 'history'
		},
		'19': {
			name: 'Est',
			group: 'history'
		},
		'22': {
			name: 'Job',
			group: 'poetry'
		},
		'23': {
			name: 'Psa',
			group: 'poetry'
		},
		'24': {
			name: 'Pro',
			group: 'poetry'
		},
		'25': {
			name: 'Ecc',
			group: 'poetry'
		},
		'26': {
			name: 'Son',
			group: 'poetry'
		},
		'29': {
			name: 'Isa',
			group: 'major prophets'
		},
		'30': {
			name: 'Jer',
			group: 'major prophets'
		},
		'31': {
			name: 'Lam',
			group: 'poetry'
		},
		'33': {
			name: 'Eze',
			group: 'major prophets'
		},
		'34': {
			name: 'Dan',
			group: 'major prophets'
		},
		'35': {
			name: 'Hos',
			group: 'minor prophets'
		},
		'36': {
			name: 'Joe',
			group: 'minor prophets'
		},
		'37': {
			name: 'Amo',
			group: 'minor prophets'
		},
		'38': {
			name: 'Oba',
			group: 'minor prophets'
		},
		'39': {
			name: 'Jon',
			group: 'minor prophets'
		},
		'40': {
			name: 'Mic',
			group: 'minor prophets'
		},
		'41': {
			name: 'Nah',
			group: 'minor prophets'
		},
		'42': {
			name: 'Hab',
			group: 'minor prophets'
		},
		'43': {
			name: 'Zep',
			group: 'minor prophets'
		},
		'44': {
			name: 'Hag',
			group: 'minor prophets'
		},
		'45': {
			name: 'Zec',
			group: 'minor prophets'
		},
		'46': {
			name: 'Mal',
			group: 'minor prophets'
		},
		'47': {
			name: 'Mat',
			group: 'gospel'
		},
		'48': {
			name: 'Mar',
			group: 'gospel'
		},
		'49': {
			name: 'Luk',
			group: 'gospel'
		},
		'50': {
			name: 'Joh',
			group: 'gospel'
		},
		'51': {
			name: 'Act',
			group: 'acts'
		},
		'52': {
			name: 'Rom',
			group: 'epistles of Paul'
		},
		'53': {
			name: '1Co',
			group: 'epistles of Paul'
		},
		'54': {
			name: '2Co',
			group: 'epistles of Paul'
		},
		'55': {
			name: 'Gal',
			group: 'epistles of Paul'
		},
		'56': {
			name: 'Eph',
			group: 'epistles of Paul'
		},
		'57': {
			name: 'Phi',
			group: 'epistles of Paul'
		},
		'58': {
			name: 'Col',
			group: 'epistles of Paul'
		},
		'59': {
			name: '1Th',
			group: 'epistles of Paul'
		},
		'60': {
			name: '2Th',
			group: 'epistles of Paul'
		},
		'61': {
			name: '1Ti',
			group: 'epistles of Paul'
		},
		'62': {
			name: '2Ti',
			group: 'epistles of Paul'
		},
		'63': {
			name: 'Tit',
			group: 'epistles of Paul'
		},
		'64': {
			name: 'Phm',
			group: 'epistles of Paul'
		},
		'65': {
			name: 'Heb',
			group: 'letters'
		},
		'66': {
			name: 'Jam',
			group: 'letters'
		},
		'67': {
			name: '1Pe',
			group: 'letters'
		},
		'68': {
			name: '2Pe',
			group: 'letters'
		},
		'69': {
			name: '1Jo',
			group: 'letters'
		},
		'70': {
			name: '2Jo',
			group: 'letters'
		},
		'71': {
			name: '3Jo',
			group: 'letters'
		},
		'72': {
			name: 'Jude',
			group: 'letters'
		},
		'73': {
			name: 'Rev',
			group: 'prophecy'
		}
	};
}

export const bookGroupingsService = new BookGroupingsService();
