export const defaultPageContent = {
  tagline: "A LITTLE ENGLISH, EVERY DAY.",
  sidebarQuote: "Every little step is progress.",
  sidebarCaption: "LET’S GROW TOGETHER ♡",
  headerCaption: "the learning journal",
  homeEyebrow: "LANGUAGE, CULTURE & CURIOSITY",
  homeBadge: "Learning can feel light",
  homeTitle: "A curious mind.\nA world of stories.",
  homeIntro: "Explore English through art, history and the music you love. Stories to read, ideas to share, and a little room for curiosity.",
  studentTitle: "Let’s keep growing.",
  studentIntro: "Your materials, activities and new discoveries are here. One step at a time, always moving forward.",
  aboutBadge: "English at your own pace",
  contactTitle: "A conversation can\nbe the first step.",
  contactIntro: "Get in touch with the teacher to learn more about private English lessons.",
  collectionTitle: "Our learning collection",
  progressIntro: "Progress towards each student’s current learning goal, updated by the teacher.",
  journalTitle: "Notes from Natalia",
  practiceNote: "A little practice goes a long way. Take a few minutes to practise today.",
  footer: "Made with care. Shared with love. ♡",
};
export type PageContent = typeof defaultPageContent;
export function pageContent(value?: Partial<PageContent>): PageContent {
  return { ...defaultPageContent, ...value };
}
