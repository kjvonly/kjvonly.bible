# BibleDB

`BibleDB` is a class that abstracts accessing `IndexedDB`. It's responsible for fetching the `Data` and storing it locally and then providing `Modules` access to the data that is stored in `IndexedDB`. 

## Data
### Chapter 
There are `1189` chapters in the `Holy Bible`. These chapters are stored in the `bible` `IndexdedDB` database in the `chapters` table. The ID for each chapter is represented as `<BookID>_<Chapter>`. Genesis 1 would be `1_1`, Genesis 2 would be `1_2`.

!!! important
    Use `booknames['booknamesByName']` map to get the `BookID`. The ids are not sequential. For example, Revelation `BookID` is 73 instead of 66. This is a result of the Public Domain version of the KJV Bible we use.

```typescript
bibleDB.getValue('chapters', chapterKey)
```

### BookNames

### Strong's

