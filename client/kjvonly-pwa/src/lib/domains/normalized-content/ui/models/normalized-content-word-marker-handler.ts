import type {
	NormalizedContentAddress
} from '../../models/normalized-content-address.model';

/**
 * A read-only, canonical-address membership projection for inline word markers.
 * Marker data is presentation-only; the renderer never queries Notes or Bookmarks.
 */
export type NormalizedContentWordMarkers =
	ReadonlyMap<string, ReadonlySet<number>>;

/** Activates a Notes or Bookmarks indicator at the exact canonical word address. */
export type NormalizedContentWordMarkerHandler = (
	address: NormalizedContentAddress
) => void;
