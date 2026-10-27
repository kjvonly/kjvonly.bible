/** Resource icon keys selected from publisher metadata or dataType fallback. */
export type FileManagerResourceIconID =
	| 'article'
	| 'notes'
	| 'post'
	| 'book'
	| 'audio'
	| 'video'
	| 'image'
	| 'document'
	| 'other';

/** Semantic icon keys used by FileManager item presentation. */
export type FileManagerIconID =
	| 'publisher'
	| 'folder'
	| FileManagerResourceIconID;
