export interface Settings {
  fontSize: string;
  fontWeight: number;
  fontFamily: string;
  colorTheme?: string;
  isDarkTheme?: boolean;
  showParagraphs?: boolean;
  showPericopes?: boolean;
  showBibleVersion?: boolean;
  enableMaxWidth?: boolean;
}

export function newSettings(): Settings {
  return {
    fontSize: 'text-base',
    fontWeight: 400,
    fontFamily: 'sans',
    colorTheme: 'red',
    isDarkTheme: false,
    showParagraphs: false,
    showPericopes: false,
    showBibleVersion: false,
    enableMaxWidth: true
  };
}
