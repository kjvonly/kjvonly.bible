import {
	describe,
	expect,
	it
} from 'vitest';

import {
	getDocumentLocalLinkTargetId,
	getUnsafeNormalizedLinkScheme,
	isSafeNormalizedLinkTarget
} from './normalized-link-target.js';

describe(
	'normalized link target policy',
	() => {
		it.each([
			'javascript:alert(1)',
			' JavaScript:alert(1)',
			'java\nscript:alert(1)',
			'vbscript:msgbox(1)',
			'data:text/html,<script>alert(1)</script>'
		])(
			'rejects executable browser-native target %s',
			(target: string) => {
				expect(
					isSafeNormalizedLinkTarget(
						target
					)
				).toBe(
					false
				);
				expect(
					getUnsafeNormalizedLinkScheme(
						target
					)
				).toBeDefined();
			}
		);

		it.each([
			'/kjv/1_1_1',
			'#fn1',
			'./chapter-2',
			'../part-2',
			'https://example.com',
			'mailto:reader@example.com',
			''
		])(
			'keeps non-executable target %s opaque',
			(target: string) => {
				expect(
					isSafeNormalizedLinkTarget(
						target
					)
				).toBe(
					true
				);
			}
		);

		it(
			'extracts named local targets without treating # as an identity',
			() => {
				expect(
					getDocumentLocalLinkTargetId(
						'#fn1'
					)
				).toBe(
					'fn1'
				);
				expect(
					getDocumentLocalLinkTargetId(
						'#'
					)
				).toBeUndefined();
			}
		);
	}
);
