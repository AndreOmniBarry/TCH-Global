import type { Prop, Scene, Story } from './stories';

type Q = [string, string, string, string, number];
export type Raw = [string, string, string, Scene, Prop, string[], string, string, string, string, string, string, string, Q[], string];

/** Compact story rows to Story objects. Words: "WORD:clue|WORD:clue". */
export function mk([id, title, ref, scene, prop, pages, vText, vRef, thought, deep, confess, prayer, challenge, quiz, words]: Raw): Story {
  return {
    id, title, ref, scene, prop, pages, verse: { text: vText, ref: vRef }, thought, deep, confess, prayer, challenge,
    quiz: quiz.map(([q, a, b, c, n]) => ({ q, options: [a, b, c], a: n })),
    words: words.split('|').map((x) => { const [w, clue] = x.split(':'); return { w, clue }; }),
  };
}
