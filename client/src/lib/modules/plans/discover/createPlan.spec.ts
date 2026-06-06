import { bookIDByBookNameService } from '$lib/services/bibleMetadata/bookIDByBookName.service';
import { bookIDByshortBookNamesService } from '$lib/services/bibleMetadata/bookIDByshortBookNames.service';
import { booksChaptersVerseCountByIDService } from '$lib/services/bibleMetadata/booksChaptersVerseCountByID.service';
import { booksChaptersVerseCountByIDNumberService } from '$lib/services/bibleMetadata/booksChaptersVerseCountByIDNumber.service';
import { shortBookNamesByIDService } from '$lib/services/bibleMetadata/shortBookNamesByID.service';
import { describe, it } from 'vitest';

describe('sum test', () => {
  it('adds 1 + 2 to equal 3', () => {
    Array('Job', 'Proverbs', 'Ecclesiastes').forEach((bookName) => {
      let id = bookIDByBookNameService.get(bookName);
      let book = booksChaptersVerseCountByIDService.get(id);
      book
        ?.keys()
        .toArray()
        .sort((a: string, b: string) => parseInt(a) - parseInt(b))
        .forEach((ch) => console.log(`"${id}/${ch}/1-${book.get(ch)}",`));
    });
  });
});

describe('idByShortnames', () => {
  it('should output', () => {
    shortBookNamesByIDService.keys().forEach((k) => {
      console.log(`['${shortBookNamesByIDService.get(k).toLowerCase()}', ${k}],`)
    })
  })
})
describe('createNTPlan', () => {
  it('should output', () => {
    createMonthNTPlan()
  })
})

let NT_Month_Plan = [
  'luk 1-5',
  'luk 6-11',
  'luk 12-18',
  'luk 19-24',
  'act 1-7',
  'act 8-14',
  'act 15-21',
  'act 22-28',
  '1ti,2ti,tit',
  'eph,phi',
  'heb',
  'mar 1-9',
  'mar 10-16',
  '1pe,2pe,col',
  'rom 1-11',
  'rom 12-16,1th,2th',
  '1co 1-10',
  '1co 11-16',
  '2co',
  'jam,gal',
  'mat 1-9',
  'mat 10-14',
  'mat 15-22',
  'mat 23-28',
  'phm,jude,1jo,2jo,3jo',
  'joh 1-6',
  'joh 7-12',
  'joh 13-21',
  'rev 1-11',
  'rev 12-22'
]


interface Reading {
  index: number
  shortBooknamesChapters: string
  encodedReading: string
  verseCount: number
}

function createMonthNTPlan() {
  let plan = NT_Month_Plan.map(day => {
    return day.split(',').map(reading => {
      return decorate(reading)
    }).reduce((p, c) => {
      return {
        encodedReading: p.encodedReading += ';' + c.encodedReading,
        verseCount: p.verseCount += c.verseCount,
        shortBooknamesChapters: p.shortBooknamesChapters += ',' + c.shortBooknamesChapters
      }
    })
  }).map((r, i) => {
    r.index = i
    return r
  })
  console.log(plan)
  console.log(plan.keys().toArray().length)
  console.log(plan.reduce((p, c) => {
    return { verseCount: p.verseCount + c.verseCount }
  }))
  console.log(plan.map((r) => {
    return r.encodedReading
  }))
}

function decorate(reading: string) {
  let bookChapters = reading.split(' ')
  if (bookChapters.length == 1) {
    return entireBook(reading)
  }
  let shortName = bookChapters[0]
  let chapters = bookChapters[1].split('-')
  return encodeBookChapters(reading, shortName, chapters)
}

function encodeBookChapters(reading: string, shortBookName: string, chapters: string[]): Reading {
  let start = parseInt(chapters[0])
  let end = start
  if (chapters.length == 2) {
    end = parseInt(chapters[1])
  }
  let bookID = bookIDByshortBookNamesService.get(shortBookName)
  let bookChapters = booksChaptersVerseCountByIDService.get(`${bookID}`)

  let readings = []
  let totalVerses = 0;
  for (let i = start; i <= end; i++) {
    let maxVerse = bookChapters.get(`${i}`)
    totalVerses += parseInt(maxVerse)
    readings.push(`${bookID}/${i}/1-${maxVerse}`)
  }
  let encodedReading = readings.join(';')
  return { encodedReading: encodedReading, shortBooknamesChapters: reading, verseCount: totalVerses }
}

function entireBook(shortBookName: string): Reading {
  let bookID = bookIDByshortBookNamesService.get(shortBookName)
  let bookChapters = booksChaptersVerseCountByIDService.get(`${bookID}`)
  let keys = bookChapters.keys().toArray().sort((a, b) => parseInt(a) - parseInt(b))
  let totalVerses = 0
  let encodedReading = keys.map(ch => {
    let maxVerse = bookChapters.get(ch);
    totalVerses += parseInt(maxVerse)
    return `${bookID}/${ch}/1-${maxVerse}`
  }).join(';')
  return { encodedReading: encodedReading, shortBooknamesChapters: shortBookName, verseCount: totalVerses }
}


let NT_MEMORY_5_YEAR = [
  [
    '1ti',
    '2ti',
    'tit',
    'eph',
    'phi',
    'heb',
    'mar',
  ],
  [
    '1pe',
    '2pe',
    'col',
    'rom',
    '1th',
    '2th',
    '1co'
  ],
  [
    '2co',
    'jam',
    'gal',
    'mat'
  ],
  [
    'phm',
    'jude',
    '1jo',
    '2jo',
    '3jo',
    'joh',
    'rev'
  ],
  [
    'luk',
    'act'
  ]
]

describe('5year', () => {
  it('should', () => {
    let flatten = NT_MEMORY_5_YEAR.map(b => {
      let t = getTotalVerses(b)
      let bins = createBins(t, Math.floor(t / 365), (t / 365.0) % 1)
      let verses = flattenToSingleVerses(b)
      let binedVerses = binVerses(bins, verses)
      let concatedReadings = concatSynchronousReadings(binedVerses)
      return concatedReadings
    }).flat()
    console.log(JSON.stringify(flatten))
  })
})

function getTotalVerses(books: string[]) {
  let totalVerses = 0;
  books.forEach(b => {
    let bookID = bookIDByshortBookNamesService.get(b)
    totalVerses += booksChaptersVerseCountByIDService.get(`${bookID}`).entries().map(c => {
      return parseInt(c[1])
    }).reduce((p, c) => {
      return p + c
    })

  })
  return totalVerses
}

function createBins(totalItems: number, verseCountPerDay: number, remainderPerDay: number): number[] {
  const bins: number[] = [];
  let carry = 0;

  for (let i = 0; i < totalItems;) {
    carry += remainderPerDay;
    if (carry >= 1) {
      i += verseCountPerDay + 1
      if (i > totalItems) {
        bins.push(totalItems - (i - verseCountPerDay - 1))
      } else {
        bins.push(verseCountPerDay + 1); // Add a bin of size 5
      }
      carry -= 1;
    } else {
      i += verseCountPerDay
      if (i > totalItems) {
        bins.push(totalItems - (i - verseCountPerDay))
      } else {
        bins.push(verseCountPerDay); // Add a bin of size 4
      }
    }
  }

  return bins;
}

function flattenToSingleVerses(books: string[]) {
  return books.map(b => {
    let bookID = bookIDByshortBookNamesService.get(b)
    let book = booksChaptersVerseCountByIDNumberService.get(bookID)
    let chapters = book.keys().toArray().sort((a, b) => a - b)

    let verses = []
    for (let ch of chapters) {
      let v = book.get(ch)
      for (let i = 1; i <= v; i++) {
        verses.push(`${bookID}/${ch}/${i}`)
      }
    }
    return verses
  }).flat()
}


function binVerses(bins: number[], verses: string[]) {

  let verseBins = []
  bins.forEach(b => {
    let vs = []
    for (let i = 0; i < b; i++) {
      vs.push(verses.shift())
    }
    verseBins.push(vs)
  })

  return verseBins
}

/**
 * Concat synchronous verses. e.g. If there are 4 bookChapterVereseReferences from the same book/chapter
 * Combine the verses e.g. 61/1/1, 61/1/2, 61/1/3, 61/1/4 becomes 61/1/1-4
 * @param bindedVerses bookChapterVerseReferences by year. Single Verse binned by day e.g. 4 vereses.
 *
 * @returns 
 */
function concatSynchronousReadings(bindedVerses: string[][]) {
  let concatedReadings = []
  bindedVerses.forEach(readings => {

    let versesByBookChapter = {}
    let concatedReading = []
    let idx = 0
    for (let r of readings) {
      let [b, c, v] = r.split('/')
      let bookChapter = `${b}/${c}`
      let group = versesByBookChapter[bookChapter]
      if (!group) {
        group = { idx: idx, verses: [] }
        versesByBookChapter[bookChapter] = group
      }
      group.verses.push(v)
      idx++
    }

    Object.keys(versesByBookChapter).sort((a, b) => {
      return versesByBookChapter[a].index - versesByBookChapter[b].index
    }).forEach(bookChapter => {
      let group = versesByBookChapter[bookChapter]
      let max = Math.max(...group.verses)
      let min = Math.min(...group.verses)

      concatedReading.push(`${bookChapter}/${min}-${max}`)
    })
    concatedReadings.push(concatedReading.join(';'))
  })
  return concatedReadings
}
