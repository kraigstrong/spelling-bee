import { lessonSchema } from "./lesson";

export const demoLesson = lessonSchema.parse({
  schemaVersion: 1,
  title: "The Great Moon Cookie Caper",
  grade: 3,
  theme: { name: "Space snack rescue", emoji: "🚀", accent: "violet" },
  words: [
    {
      id: "because",
      spelling: "because",
      trickySpans: [{ start: 3, end: 6 }],
      hint: "The middle has the letters a, u, s—in that order.",
      definition: "For the reason that.",
    },
    {
      id: "friend",
      spelling: "friend",
      trickySpans: [{ start: 2, end: 4 }],
      hint: "Remember: i comes before e in this word.",
      definition: "Someone you like and enjoy spending time with.",
    },
    {
      id: "enough",
      spelling: "enough",
      trickySpans: [{ start: 2, end: 6 }],
      hint: "The ending ough sounds like uff.",
      definition: "As much as you need.",
    },
    {
      id: "believe",
      spelling: "believe",
      trickySpans: [{ start: 3, end: 5 }],
      hint: "There is an ie after the l.",
      definition: "To think something is true.",
    },
    {
      id: "different",
      spelling: "different",
      trickySpans: [{ start: 2, end: 5 }],
      hint: "Two f letters, followed by e.",
      definition: "Not the same.",
    },
    {
      id: "surprise",
      spelling: "surprise",
      trickySpans: [{ start: 2, end: 5 }],
      hint: "There is an r on both sides of the p.",
      definition: "Something you did not expect.",
    },
    {
      id: "thought",
      spelling: "thought",
      trickySpans: [{ start: 2, end: 6 }],
      hint: "The middle is ough. The g and h are silent.",
      definition: "An idea in your mind, or the past tense of think.",
    },
    {
      id: "favorite",
      spelling: "favorite",
      trickySpans: [{ start: 3, end: 5 }],
      hint: "An o and an r come after fav.",
      definition: "The one you like best.",
    },
    {
      id: "special",
      spelling: "special",
      trickySpans: [{ start: 3, end: 6 }],
      hint: "The cial ending sounds like shul.",
      definition: "Unusual or important in a good way.",
    },
    {
      id: "finally",
      spelling: "finally",
      trickySpans: [{ start: 3, end: 6 }],
      hint: "The ending ally has two l letters.",
      definition: "At last, after waiting.",
    },
  ],
  chapters: [
    {
      title: "An urgent snack situation",
      tokens: [
        { text: "Captain Pip launched toward the moon " },
        { wordId: "because" },
        { text: " someone had stolen its giant cookie! His best " },
        { wordId: "friend" },
        { text: ", a tiny robot named Crumb, packed " },
        { wordId: "enough" },
        { text: " snacks for the trip. “I " },
        { wordId: "believe" },
        { text: " we can find it,” said Pip. Crumb beeped bravely." },
      ],
    },
    {
      title: "Follow the crumbs",
      tokens: [
        { text: "Every moon rock looked " },
        { wordId: "different" },
        { text: ". One wore a hat. Another had wheels. Then came a " },
        { wordId: "surprise" },
        { text: ": a trail of chocolate chips! Pip " },
        { wordId: "thought" },
        { text: " about his " },
        { wordId: "favorite" },
        { text: " dessert and followed the trail into a crater." },
      ],
    },
    {
      title: "The sweetest landing",
      tokens: [
        { text: "Inside sat a lonely moon mouse. She had baked a " },
        { wordId: "special" },
        {
          text: " birthday cake, but nobody had come to her party. Pip and Crumb ",
        },
        { wordId: "finally" },
        {
          text: " solved the mystery. They shared the cookie, sang a squeaky birthday song, and flew home with crumbs in their helmets.",
        },
      ],
    },
  ],
});
