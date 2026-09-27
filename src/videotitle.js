// QVAC Video Title Generator — core logic.
// completion() writes 3-5 title options grounded in the user's own video
// description. The one-shot example is real multi-turn history (not
// prose in the system prompt) so the small model is much less likely to
// parrot it verbatim regardless of the real input.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 120) return true;
  const bad = [
    "i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "i don't have",
    "not enough information", "please provide more", "please try again",
    "i'd be happy to help", "could you provide", "can you provide", "i need more",
  ];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

function cleanLine(line) {
  return line
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

const EXAMPLE_INPUT =
  "A 10-minute video where I take apart an old mechanical keyboard, clean every " +
  "switch by hand, and put it back together to see if it feels better than new.";
const EXAMPLE_OUTPUT = `1. I Deep Cleaned My Old Mechanical Keyboard
2. Taking Apart & Cleaning Every Switch
3. Does Cleaning Old Switches Feel Better Than New?
4. Full Mechanical Keyboard Teardown & Clean
5. Restoring a Mechanical Keyboard, Switch by Switch`;
const EXAMPLE_LINES = EXAMPLE_OUTPUT.split("\n").map(cleanLine).map((l) => l.toLowerCase());

function fallback(description) {
  const trimmed =
    description.length > 55 ? description.slice(0, 55).trim() + "..." : description;
  return [trimmed, `Watch: ${trimmed}`, `${trimmed} (Full Video)`];
}

export async function generate(modelId, description) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content:
          "You write short, clickable video titles. Given a description of a " +
          "video's content, output exactly 5 numbered title options (each under " +
          "12 words), one per line, in this exact format:\n" +
          "1. <title>\n2. <title>\n3. <title>\n4. <title>\n5. <title>\n" +
          "Base every title only on what is actually described — do not invent " +
          "details, guests, events, specific place names, or numbers that are not " +
          "mentioned. No other text.",
      },
      { role: "user", content: `Video description: ${EXAMPLE_INPUT}` },
      { role: "assistant", content: EXAMPLE_OUTPUT },
      { role: "user", content: `Video description: ${description}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.8, maxTokens: 220 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Only keep lines that actually match the requested numbered format —
    // this drops any preamble/postamble sentence the model adds (e.g.
    // "Here are 5 titles:"), which would otherwise slip through as a
    // bogus extra "title".
    .filter((l) => /^\d+[.)]/.test(l))
    .map(cleanLine)
    .filter((l) => l.length > 0 && !looksUnusable(l))
    // Guard against the model parroting the one-shot example verbatim.
    .filter((l) => !EXAMPLE_LINES.includes(l.toLowerCase()));

  const titles = [...new Set(lines)].slice(0, 5);

  if (titles.length < 3) {
    return { titles: fallback(description) };
  }
  return { titles };
}
