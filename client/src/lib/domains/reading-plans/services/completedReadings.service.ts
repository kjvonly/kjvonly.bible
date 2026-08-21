import { completedReadingsApi } from '$lib/nostr/events/completedReadings.nostr';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
import {
  type NavReadings,
  type CompletedReadings,
  type Sub,
  type Plan,
  type Readings,
  NullSub
} from '$lib/models/plans.model';
import { plansPubSubService } from './plansPubSub.service';
import { subsEnricherService } from './subsEnricher.service';

/**
 * {@link CompletedReadingsService} is responsible for processing a
 * {@link CompletedReadings} after a user completes a reading.
 */
export class CompletedReadingsService {
  /**
   * Must delete navReadings after processing the the completed reading
   * otherwise you'll get a forever loop since we publish the completed
   * readings and the worker publishes the completed readings to other
   * views subscribed to {@link getAllSubs}
   *
   * @param pane
   */
  cleanup(pane: Pane) {
    delete pane.buffer.bag.navReadings;
  }

  /**
   * When a {@link NavReadings} exists when Sub subscribers receive Subs, it
   * means a user completed a readings for a Sub. This function converts
   * {@link NavReadings} to {@link CompletedReadings}
   *
   * @param nr
   * @returns
   */
  navReadingsToCompletedReadings(nr: NavReadings): CompletedReadings {
    return {
      id: `${nr.subID}/${nr.subNestedReadingsIndex}`,
      index: nr.subNestedReadingsIndex,
      subID: nr.subID,
      version: 0
    };
  }

  /**
   *  Save completed reading to track user progress
   *
   * @param cr {@link CompletedReadings}
   */
  async save(cr: CompletedReadings) {
    await completedReadingsApi.put(cr);
  }

  /**
   * We need to notify the worker that the user completed a {@link Readings}.
   * The worker on boot initializes the data that exists in indexedDB.
   * After the initialization it's the responsibility of the developer to
   * publish any updates to the worker that modify the stored state e.g.
   * {@link Plan}, {@link Sub}, {@link CompletedReadings} maps.
   */
  notifyWorker(cr: CompletedReadings) {
    plansPubSubService.putReading(cr, cr.subID);
  }

  /**
   * After a user completes a {@link Readings}, the {@link Sub.completedReadings}
   * and {@link Sub.nextReadingsIndex}  needs to be updated in place so the
   * view shows the latest {@link NextReadings}. If not, the view may show
   * stale data until the Worker publishes the update.
   *
   * @param subs
   * @param nr
   * @param cr
   * @returns
   */
  updateSubMetadata(
    subs: Map<string, Sub>,
    nr: NavReadings,
    cr: CompletedReadings
  ): Sub {
    let sub = subs.get(cr.subID);
    if (!sub) {
      return NullSub();
    }

    sub.completedReadings.set(nr.subNestedReadingsIndex, cr);
    sub.nextReadingsIndex = subsEnricherService.getNextReadingIndex(
      Object.keys(sub.completedReadings).map((v) => parseInt(v))
    );
    subsEnricherService.setPercentComplete(sub);
    return sub;
  }
}

export const completedReadingsService = new CompletedReadingsService();
