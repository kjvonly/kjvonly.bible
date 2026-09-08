export class ShortBookNamesByIDService {
	get(id: string): string {
		let shortBookName = this.map.get(id);
		if (!shortBookName) {
			shortBookName = 'Gen';
			console.log(`error retrieving book name by id. Invalid id ${id}`);
		}
		return shortBookName;
	}

	keys(): string[] {
		return this.map.keys().toArray();
	}

	map = new Map([
		['1', 'Gen'],
		['2', 'Exo'],
		['3', 'Lev'],
		['4', 'Num'],
		['5', 'Deu'],
		['6', 'Jos'],
		['7', 'Jud'],
		['8', 'Rut'],
		['9', '1Sa'],
		['10', '2Sa'],
		['11', '1Ki'],
		['12', '2Ki'],
		['13', '1Ch'],
		['14', '2Ch'],
		['15', 'Ezr'],
		['16', 'Neh'],
		['19', 'Est'],
		['22', 'Job'],
		['23', 'Psa'],
		['24', 'Pro'],
		['25', 'Ecc'],
		['26', 'Son'],
		['29', 'Isa'],
		['30', 'Jer'],
		['31', 'Lam'],
		['33', 'Eze'],
		['34', 'Dan'],
		['35', 'Hos'],
		['36', 'Joe'],
		['37', 'Amo'],
		['38', 'Oba'],
		['39', 'Jon'],
		['40', 'Mic'],
		['41', 'Nah'],
		['42', 'Hab'],
		['43', 'Zep'],
		['44', 'Hag'],
		['45', 'Zec'],
		['46', 'Mal'],
		['47', 'Mat'],
		['48', 'Mar'],
		['49', 'Luk'],
		['50', 'Joh'],
		['51', 'Act'],
		['52', 'Rom'],
		['53', '1Co'],
		['54', '2Co'],
		['55', 'Gal'],
		['56', 'Eph'],
		['57', 'Phi'],
		['58', 'Col'],
		['59', '1Th'],
		['60', '2Th'],
		['61', '1Ti'],
		['62', '2Ti'],
		['63', 'Tit'],
		['64', 'Phm'],
		['65', 'Heb'],
		['66', 'Jam'],
		['67', '1Pe'],
		['68', '2Pe'],
		['69', '1Jo'],
		['70', '2Jo'],
		['71', '3Jo'],
		['72', 'Jude'],
		['73', 'Rev']
	]);
}

export const shortBookNamesByIDService = new ShortBookNamesByIDService();
