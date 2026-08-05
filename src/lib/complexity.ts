/**
 * Scores an Icelandic expression from 1–100 for balanced study-pack creation.
 * Word count contributes most of the score; lexical length and structural
 * alternatives provide smaller refinements.
 */
export function calculateComplexity(expression: string): number {
  const words = expression.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  if (words.length === 0) return 1;

  const lengths = words.map((word) => Array.from(word).length);
  const averageLength = lengths.reduce((sum, length) => sum + length, 0) / words.length;
  const longWordRatio = lengths.filter((length) => length >= 9).length / words.length;
  const letterCount = lengths.reduce((sum, length) => sum + length, 0);
  const variants = (expression.match(/[()/]/g) ?? []).length;

  const wordScore = Math.min(65, words.length * 7);
  const averageLengthScore = Math.min(16, Math.max(0, averageLength - 4) * 3);
  const longWordScore = longWordRatio * 10;
  const lengthScore = Math.min(5, Math.max(0, letterCount - 30) / 8);
  const variantScore = Math.min(4, variants);

  return Math.max(
    1,
    Math.min(100, Math.round(wordScore + averageLengthScore + longWordScore + lengthScore + variantScore)),
  );
}
