export class BookIDByShortBookNamesService {
  get(shortBookName: string): number {
    let id = this.map.get(shortBookName);
    if (!id) {
      id = 1
      console.log(`error retrieving bookID by short name. Invalid shortBookName ${shortBookName}`);
    }
    return id;
  }

  keys(): string[] {
    return this.map.keys().toArray();
  }

  map = new Map([
    ['gen', 1],
    ['exo', 2],
    ['lev', 3],
    ['num', 4],
    ['deu', 5],
    ['jos', 6],
    ['jud', 7],
    ['rut', 8],
    ['1sa', 9],
    ['2sa', 10],
    ['1ki', 11],
    ['2ki', 12],
    ['1ch', 13],
    ['2ch', 14],
    ['ezr', 15],
    ['neh', 16],
    ['est', 19],
    ['job', 22],
    ['psa', 23],
    ['pro', 24],
    ['ecc', 25],
    ['son', 26],
    ['isa', 29],
    ['jer', 30],
    ['lam', 31],
    ['eze', 33],
    ['dan', 34],
    ['hos', 35],
    ['joe', 36],
    ['amo', 37],
    ['oba', 38],
    ['jon', 39],
    ['mic', 40],
    ['nah', 41],
    ['hab', 42],
    ['zep', 43],
    ['hag', 44],
    ['zec', 45],
    ['mal', 46],
    ['mat', 47],
    ['mar', 48],
    ['luk', 49],
    ['joh', 50],
    ['act', 51],
    ['rom', 52],
    ['1co', 53],
    ['2co', 54],
    ['gal', 55],
    ['eph', 56],
    ['phi', 57],
    ['col', 58],
    ['1th', 59],
    ['2th', 60],
    ['1ti', 61],
    ['2ti', 62],
    ['tit', 63],
    ['phm', 64],
    ['heb', 65],
    ['jam', 66],
    ['1pe', 67],
    ['2pe', 68],
    ['1jo', 69],
    ['2jo', 70],
    ['3jo', 71],
    ['jude', 72],
    ['rev', 73],
  ]);
}

export const bookIDByshortBookNamesService = new BookIDByShortBookNamesService();

