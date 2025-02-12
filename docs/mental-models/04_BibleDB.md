# 4. BibleDB

`BibleDB` is a class that abstracts accessing `IndexedDB`. It's responsible for fetching the `Data` and storing it locally and then providing `Modules` access to the data that is stored in `IndexedDB` with the `ChapterService`. 


## Chapter 
There are `1189` chapters in the `Holy Bible`. These chapters are stored in the `bible` `IndexdedDB` database in the `chapters` table. The ID for each chapter is represented as `<BookID>_<Chapter>`. Genesis 1 would be `1_1`, Genesis 2 would be `1_2`.

!!! important
    Use `booknames['booknamesByName']` map to get the `BookID`. The ids are not sequential. For example, Revelation `BookID` is 73 instead of 66. This is a result of the Public Domain version of the KJV Bible we use.

```typescript
bibleDB.getValue('chapters', chapterKey)
```

### Data Structure

| chapter   | type                | description                 |
| --------- | ------------------- | --------------------------- |
| number    | number              | chapter                     |
| bookName  | string              | Book                        |
| verses    | map<string, verse>  | array of verses             |
| verseMap  | map<string, string> | a map of the the verse text |
| footnotes | map<string, string> | footnotes for words         |


| verse  | type   | description         |
| ------ | ------ | ------------------- |
| number | number | verse e.g. 1, 2, 10 |
| words  | word[] | array of words      |


| word  | type     | description                                                     |
| ----- | -------- | --------------------------------------------------------------- |
| text  | string   | the word                                                        |
| class | string[] | list of classes to add to that word e.g red text                |
| href  | string[] | any references for that word e.g. Strong's or a verse reference |


### Psalm 117

Below is the chapter content for `Psalms 117`. 

```json
{
  "number": 117,
  "bookName": "Psalm",
  "verses": {
    "1": {
      "number": 1,
      "words": [
        {
          "text": "1",
          "class": [
            "vno"
          ],
          "href": null,
          "emphasis": false
        },
        {
          "text": "O",
          "class": null,
          "href": null,
          "emphasis": false
        },
  ...
  ...
      ],
      "text": "1 O praise the Lord, all ye nations: praise him, all ye people."
    },
    "2": {
      "number": 2,
      "words": [
        {
          "text": "2",
          "class": [
            "vno"
          ],
          "href": null,
          "emphasis": false
        },
        {
          "text": "For",
          "class": null,
          "href": null,
          "emphasis": false
        },
        {
          "text": "his",
          "class": null,
          "href": null,
          "emphasis": false
        },
        {
          "text": "mer­ciful",
          "class": [
            "xref"
          ],
          "href": [
            "H2617"
          ],
          "emphasis": false
        },
        ...
        ...
      ],
      "text": "2 For his merciful kindness is great toward us: and the truth of the Lord endureth for ever. Praise ye the Lord."
    }
  },
  "verseMap": {
    "1": "O praise the Lord, all ye nations: praise him, all ye people.",
    "2": "For his merciful kindness is great toward us: and the truth of the Lord endureth for ever. Praise ye the Lord."
  },
  "footnotes": {
    "1": "\u003Cem\u003EGentiles\u003C/em\u003E",
    "2": "\u003Cem\u003Eglorify\u003C/em\u003E",
    "3": "\u003Cem\u003Elovingkindness\u003C/em\u003E"
  }
}
```

## Booknames

Booknames is a data structure that provides the metadata for chapters. booknames is stored in the `booknames` table in `IndexedDB`.


```json
{
    "booknamesById": {
        "1": "Genesis",
        "2": "Exodus",
        "3": "Leviticus",
        "4": "Numbers",
  ...
  ...
        "71": "3 John",
        "72": "Jude",
        "73": "Revelation"
    },
    "booknamesByName": {
        "Hebrews": 65,
        "1 Samuel": 9,
        "1 Chronicles": 13,
        "Psalm": 23,
    ...
    ...
        "Nehemiah": 16,
        "Zechariah": 45,
        "1 Peter": 67
    },
    "shortNames": {
        "1": "Gen",
        "2": "Exo",
        "3": "Lev",
        "4": "Num",
  ...
  ...
        "71": "3Jo",
        "72": "Jude",
        "73": "Rev"
    },
    "maxChapterById": {
        "1": 50,
        "10": 24,
        "11": 22,
        "12": 25,
   ...
   ...
        "73": 22,
        "8": 4,
        "9": 31
    },
    "bookchapterversecountById": {
        "1": {
            "1": 31,
            "10": 32,
            "11": 32,
            "12": 20,
        ...
        ...
            "6": 22,
            "7": 24,
            "8": 22,
            "9": 29
        },
        "10": {
            "1": 27,
            "10": 19,
            "11": 27,
      ...
      ...

            "8": 18,
            "9": 13
        },
            "7": 17,
            "8": 22,
            "9": 27
        }
    }
}
```

## Strong's

There are `14058` Strong's references. BibleDB fetches this data and stores it in the `strongs` table in `IndexedDB`.

```json
{
  "number": "G5547",
  "originalWord": "Χριστός",
  "partsOfSpeech": "Adjective",
  "phoneticSpelling": "khris-tos'",
  "transliteratedWord": "Christos",
  "usageByBook": [
    {
      "text": "Matthew",
      "href": [
        "G5547-47"
      ],
      "class": [
        "xref"
      ]
    },
    {
      "text": "Mark",
      "href": [
        "G5547-48"
      ],
      "class": [
        "xref"
      ]
    },
   ...
   ...
    {
      "text": "Revelation",
      "href": [
        "G5547-73"
      ],
      "class": [
        "xref"
      ]
    }
  ],
  "usageByWord": [
    {
      "text": "christ",
      "href": [
        "G5547",
        "christ"
      ],
      "class": [
        "xref"
      ]
    },
    {
      "text": "christ's",
      "href": [
        "G5547",
        "christ's"
      ],
      "class": [
        "xref"
      ]
    }
  ],
  "brownDef": null,
  "strongsDef": "\u003Cdiv id=\"strongdef\"\u003EFrom \u003Cspan class=\"xref\" href=\"G5548\"\u003EG5548\u003C/span\u003E; \u003Ci\u003Eanointed\u003C/i\u003E that is the \u003Ci\u003EMessiah\u003C/i\u003E an epithet of \u003Cstrong\u003EJesus:\u003C/strong\u003E - Christ.\u003C/div\u003E",
  "thayersDef": {
    "text": "",
    "children": [
      {
        "text": "Christ = \"anointed\"",
        "children": [
          {
            "text": "Christ was the Messiah, the Son of God",
            "children": null
          },
          {
            "text": "anointed",
            "children": null
          }
        ]
      }
    ]
  }
}
```