// Clearly labeled design-only stories for checking the interface without a live API request.
const descriptions = [
  "A look at the ideas, people, and places shaping the way we live.",
  "The context behind a changing world, explained in a few useful minutes.",
  "Fresh perspectives on a story that continues to evolve.",
  "A closer view of the decisions and discoveries making a difference.",
];

const titles = [
  ["The ideas changing how we see our cities", "Culture"],
  ["A new chapter for the way we work", "Business"],
  ["Why thoughtful technology still matters", "Technology"],
  ["Inside the next wave of scientific discovery", "Science"],
  ["Making room for better everyday health", "Health"],
  ["The moments that make sport unforgettable", "Sports"],
  ["The creative voices worth watching", "Entertainment"],
  ["A clearer way to understand the headlines", "World"],
  ["What comes next for our communities", "Culture"],
];

export const previewStories = titles.map(([title, section], index) => ({
  url: `preview-${index}`,
  title,
  description: descriptions[index % descriptions.length],
  source: { name: "Design preview" },
  publishedAt: new Date(Date.now() - index * 3600000).toISOString(),
  urlToImage: null,
  section,
  preview: true,
}));
