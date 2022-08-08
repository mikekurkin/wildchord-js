import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';

// @ts-ignore
import { parser } from './parser';

let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Tuning: tags.atom,
      Capo: tags.atom,
      Note: tags.keyword,
      Chord: tags.keyword,
    }),
  ],
});

export const chordLanguage = LRLanguage.define({
  parser: parserWithMetadata,
});

const chordHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--hl-chord)', fontWeight: 'bold' },
  { tag: tags.atom, color: 'var(--hl-tuning)' },
]);

export function chordsheet() {
  return new LanguageSupport(chordLanguage, syntaxHighlighting(chordHighlightStyle));
}
