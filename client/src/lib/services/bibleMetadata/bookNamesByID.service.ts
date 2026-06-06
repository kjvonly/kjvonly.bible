export class BookNamesByIDService {
	get(id: string): string {
		let bookName = this.map.get(id);
		if (!bookName) {
			bookName = 'Genesis';
			console.log(`error retrieving book name by id. Invalid id ${id}`);
		}
		return bookName;
	}

	keys(): string[] {
		return this.map.keys().toArray();
	}

	sortedKeys(): string[] {
		return this.map
			.keys()
			.toArray()
			.sort((a, b) => Number(a) - Number(b));
	}

	map = new Map([
		['1', 'Genesis'],
		['2', 'Exodus'],
		['3', 'Leviticus'],
		['4', 'Numbers'],
		['5', 'Deuteronomy'],
		['6', 'Joshua'],
		['7', 'Judges'],
		['8', 'Ruth'],
		['9', '1 Samuel'],
		['10', '2 Samuel'],
		['11', '1 Kings'],
		['12', '2 Kings'],
		['13', '1 Chronicles'],
		['14', '2 Chronicles'],
		['15', 'Ezra'],
		['16', 'Nehemiah'],
		['19', 'Esther'],
		['22', 'Job'],
		['23', 'Psalm'],
		['24', 'Proverbs'],
		['25', 'Ecclesiastes'],
		['26', 'Song of Solomon'],
		['29', 'Isaiah'],
		['30', 'Jeremiah'],
		['31', 'Lamentations'],
		['33', 'Ezekiel'],
		['34', 'Daniel'],
		['35', 'Hosea'],
		['36', 'Joel'],
		['37', 'Amos'],
		['38', 'Obadiah'],
		['39', 'Jonah'],
		['40', 'Micah'],
		['41', 'Nahum'],
		['42', 'Habakkuk'],
		['43', 'Zephaniah'],
		['44', 'Haggai'],
		['45', 'Zechariah'],
		['46', 'Malachi'],
		['47', 'Matthew'],
		['48', 'Mark'],
		['49', 'Luke'],
		['50', 'John'],
		['51', 'Acts'],
		['52', 'Romans'],
		['53', '1 Corinthians'],
		['54', '2 Corinthians'],
		['55', 'Galatians'],
		['56', 'Ephesians'],
		['57', 'Philippians'],
		['58', 'Colossians'],
		['59', '1 Thessalonians'],
		['60', '2 Thessalonians'],
		['61', '1 Timothy'],
		['62', '2 Timothy'],
		['63', 'Titus'],
		['64', 'Philemon'],
		['65', 'Hebrews'],
		['66', 'James'],
		['67', '1 Peter'],
		['68', '2 Peter'],
		['69', '1 John'],
		['70', '2 John'],
		['71', '3 John'],
		['72', 'Jude'],
		['73', 'Revelation']
	]);
}

export const bookNamesByIDService = new BookNamesByIDService();
