# @kjvonly/html-normalized-content

Shared, browser-compatible HTML-to-`NormalizedDocument` conversion.

The package owns Cheerio syntax parsing, HTML block/inline semantics, stable
block identity, diagnostics and canonical validation. Import only from its root
API. It does not use the DOM, filesystem, Nostr, storage or UI modules.

```ts
import { createHtmlNormalizer } from '@kjvonly/html-normalized-content';
const normalizer = createHtmlNormalizer();
const result = normalizer.normalizeWithDiagnostics('<p>Word</p>');
```

Consumers should run conversion in a worker for large inputs. The CLI continues
to own source IO, import orchestration and publication; Dictionary will use the
same normalizer when opening individual definitions. Existing CLI golden fixtures
and HTML unit tests live in this package to prevent semantic divergence.
