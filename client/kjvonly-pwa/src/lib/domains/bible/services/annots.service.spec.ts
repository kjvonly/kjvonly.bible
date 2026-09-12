import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type {
  Annotations
} from '$lib/domains/bible/models/bible.model';

const mocks = vi.hoisted(() => ({
  getAnnotations: vi.fn(),
  putAnnotations: vi.fn()
}));

vi.mock(
  '$lib/nostr/events/annots.nostr',
  () => ({
    annotsApi: mocks
  })
);

import {
  AnnotsService
} from './annots.service';

const GENESIS_1: Annotations = {
  id: '1_1',
  version: 1,
  annots: {}
};

const GENESIS_2: Annotations = {
  id: '1_2',
  version: 1,
  annots: {}
};

describe(
  'AnnotsService subscriptions',
  () => {
    beforeEach(() => {
      mocks.getAnnotations.mockReset();
      mocks.putAnnotations.mockReset();
    });

    it(
      'notifies subscribers for the saved annotation chapter',
      async () => {
        const genesis1Subscriber = vi.fn();
        const genesis2Subscriber = vi.fn();

        mocks.putAnnotations.mockResolvedValue(
          GENESIS_1
        );

        const service = new AnnotsService();

        service.subscribe(
          'pane-a',
          GENESIS_1.id,
          genesis1Subscriber
        );

        service.subscribe(
          'pane-b',
          GENESIS_2.id,
          genesis2Subscriber
        );

        await expect(
          service.put(GENESIS_1)
        ).resolves.toBe(GENESIS_1);

        expect(genesis1Subscriber)
          .toHaveBeenCalledOnce();

        expect(genesis1Subscriber)
          .toHaveBeenCalledWith(GENESIS_1);

        expect(genesis2Subscriber)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'replaces an existing subscription when a pane changes chapters',
      async () => {
        const oldChapterSubscriber = vi.fn();
        const newChapterSubscriber = vi.fn();

        const service = new AnnotsService();

        service.subscribe(
          'pane-a',
          GENESIS_1.id,
          oldChapterSubscriber
        );

        service.subscribe(
          'pane-a',
          GENESIS_2.id,
          newChapterSubscriber
        );

        mocks.putAnnotations.mockResolvedValueOnce(
          GENESIS_1
        );

        await service.put(GENESIS_1);

        expect(oldChapterSubscriber)
          .not.toHaveBeenCalled();

        mocks.putAnnotations.mockResolvedValueOnce(
          GENESIS_2
        );

        await service.put(GENESIS_2);

        expect(newChapterSubscriber)
          .toHaveBeenCalledOnce();
      }
    );

    it(
      'stops notifying a pane after it unsubscribes',
      async () => {
        const subscriber = vi.fn();

        mocks.putAnnotations.mockResolvedValue(
          GENESIS_1
        );

        const service = new AnnotsService();

        service.subscribe(
          'pane-a',
          GENESIS_1.id,
          subscriber
        );

        service.unsubscribe('pane-a');

        await service.put(GENESIS_1);

        expect(subscriber)
          .not.toHaveBeenCalled();
      }
    );
  }
);
