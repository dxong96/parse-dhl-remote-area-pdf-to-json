export function isNumeric(str: unknown) {
  if (typeof str === "number") return true;
  if (typeof str !== "string") return false; // we only process strings!

  return !isNaN(Number(str)); // ...and ensure strings of whitespace fail
}

// source: https://stackoverflow.com/a/68703218/19701373
export function findLongestPrefix(words: string[]): string {
  // check border cases size 1 array and empty first word)
  if (!words[0] || words.length ==  1) return words[0] || "";
  let i = 0;
  // while all words have the same character at position i, increment i
  while(words[0][i] && words.every(w => w[i] === words[0][i]))
    i++;

  // prefix is the substring from the beginning to the last successfully checked i
  return words[0].slice(0, i);
}