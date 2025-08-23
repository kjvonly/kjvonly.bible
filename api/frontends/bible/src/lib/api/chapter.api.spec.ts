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

  it('should post annot incrementing the vesion to 1', async () => {
    let data = {
      id: "50_3",
      annots: {},
      version: 0,
  
    }

    let expectedData = JSON.parse(JSON.stringify(data))
    expectedData.version = 1
    expectedData.userID = '45b5fbd3-755f-4379-8f07-a58d4a30fa2f'
    expectedData.dateCreated =  1755929876
    expectedData.dateUpdated = 1755929876

    const mockResponse = {
      json: () => Promise.resolve(expectedData),
      ok: true
    };


    api.postapi.mockResolvedValueOnce(mockResponse)

    await chapterService.putAnnotations(data)

    expect(api.postapi).toBeCalledTimes(1)
    expect(api.postapi).toBeCalledWith('/annots', data)
    expect(bibleService.putValue).toBeCalledTimes(1)
    expect(bibleService.putValue).toBeCalledWith('annotations', expectedData)
  })

})