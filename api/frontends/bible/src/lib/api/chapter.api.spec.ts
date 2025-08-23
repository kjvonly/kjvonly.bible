import { describe, expect, test, vi, it, beforeEach } from 'vitest'

import { ChapterService } from './chapters.api'

describe('chapterService', () => {

  let chapterService: any
  let api: any
  let bibleService: any

  beforeEach(() => {
    api = Object()
    api.postapi = vi.fn()
    api.updateapi = vi.fn()

    bibleService = Object()
    bibleService.putValue = vi.fn()

    chapterService = new ChapterService(api, bibleService)
  })


  let tt = [
    { startVersion: 0, endVersion: 1 },
  ]
  tt.forEach((t) => {
    it(`should post annot incrementing the vesion from ${t.startVersion} to ${t.endVersion}`, async () => {
      let data = {
        id: "50_3",
        annots: {},
        version: t.startVersion,
      }

      let expectedData = {
        id: "50_3",
        annots: {},
        version: t.endVersion,
        "userID": '45b5fbd3-755f-4379-8f07-a58d4a30fa2f',
        "dateCreated": 1755929876,
        "dateUpdated": 1755929876
      }

      const mockResponse = {
        json: () => Promise.resolve(expectedData),
        ok: true
      };

      api.postapi.mockResolvedValueOnce(mockResponse)

      let ua = await chapterService.putAnnotations(data)

      expect(ua).toEqual(expectedData)
      expect(api.postapi).toBeCalledTimes(1)
      expect(api.postapi).toBeCalledWith('/annots', data)
      expect(bibleService.putValue).toBeCalledTimes(1)
      expect(bibleService.putValue).toBeCalledWith('annotations', expectedData)
    })
  })


 tt = [
    { startVersion: 1, endVersion: 2 },
    { startVersion: 3, endVersion: 4 }
  ]
  
  tt.forEach((t) => {
    it(`should post annot incrementing the vesion from ${t.startVersion} to ${t.endVersion}`, async () => {
      let data = {
        id: "50_3",
        annots: {},
        version: t.startVersion,
      }

      let expectedData = {
        id: "50_3",
        annots: {},
        version: t.endVersion,
        "userID": '45b5fbd3-755f-4379-8f07-a58d4a30fa2f',
        "dateCreated": 1755929876,
        "dateUpdated": 1755929876
      }

      const mockResponse = {
        json: () => Promise.resolve(expectedData),
        ok: true
      };


      api.updateapi.mockResolvedValueOnce(mockResponse)

      let ua = await chapterService.putAnnotations(data)

      expect(ua).toEqual(expectedData)
      expect(api.updateapi).toBeCalledTimes(1)
      expect(api.updateapi).toBeCalledWith(`/annots/${data.id}`, data)
      expect(bibleService.putValue).toBeCalledTimes(1)
      expect(bibleService.putValue).toBeCalledWith('annotations', expectedData)
    })
  })

})