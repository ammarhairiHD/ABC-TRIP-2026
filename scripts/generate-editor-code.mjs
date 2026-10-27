#!/usr/bin/env node
// Generates the EDITOR_CODE_HASH secret for the Scenery editor (Ammar +
// Alya share one code). Two modes:
//
//   node scripts/generate-editor-code.mjs          random code (default)
//   node scripts/generate-editor-code.mjs --own    type your own code
//
// No PBKDF2 here: Workers' free-plan CPU-time limit is too small for a slow
// hash on every /api/unlock request, so this leans on the code itself being
// long (random, or validated if you supply your own) plus the rate limit in
// api/src/routes/unlock.ts (5 attempts/minute/IP) instead.
//
// --own reads the code with echo off, asks for it twice, and never prints,
// logs, or writes the plaintext code anywhere -- only the hash. It's also
// never accepted as a command-line argument, since that would land in shell
// history and `ps`.

import { webcrypto as crypto } from "node:crypto";

const WORDS = [
  "amber", "anchor", "ash", "aspen", "basin", "beacon", "birch", "bramble", "brook", "canyon",
  "cedar", "clover", "coral", "cove", "crag", "creek", "dawn", "dune", "ember", "fable",
  "fern", "flint", "forge", "glade", "granite", "grove", "harbor", "haven", "hazel", "heron",
  "hollow", "ivy", "jade", "juniper", "kestrel", "lagoon", "lantern", "larch", "ledge", "lichen",
  "lily", "linden", "lotus", "lumen", "maple", "marsh", "meadow", "mesa", "mist", "moss",
  "oak", "oasis", "opal", "orchid", "otter", "pebble", "pine", "plume", "quartz", "quill",
  "raven", "reed", "ridge", "river", "sage", "shale", "slate", "sparrow", "spruce", "summit",
  "tern", "thistle", "tide", "timber", "trail", "vale", "violet", "willow", "wren", "zephyr",
];

/** Rejection sampling: a plain `randomByte % max` would bias toward low
 * results whenever `max` doesn't evenly divide 256. */
function randomInt(maxExclusive) {
  const cutoff = 256 - (256 % maxExclusive);
  let byte;
  do {
    byte = crypto.getRandomValues(new Uint8Array(1))[0];
  } while (byte >= cutoff);
  return byte % maxExclusive;
}

function randomWord() {
  return WORDS[randomInt(WORDS.length)];
}

function randomDigits(count) {
  let out = "";
  for (let i = 0; i < count; i++) out += randomInt(10);
  return out;
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateRandomCode() {
  return `${randomWord()}-${randomWord()}-${randomWord()}-${randomWord()}-${randomDigits(4)}`;
}

/** Same construction api/src/lib/auth.ts's verifyCode expects: HMAC-SHA256
 * keyed on a random salt, both stored together as "<saltHex>:<hmacHex>". */
async function hashCode(code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code));
  return `${toHex(salt)}:${toHex(signature)}`;
}

/** Reads one line from the terminal with the terminal's echo turned off --
 * nothing is printed back, not even asterisks. Requires a real TTY (not a
 * pipe), which is also what keeps the code out of shell history: there's no
 * argument to record, only a prompt only the person at the keyboard sees. */
function readHiddenLine(promptText) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error("This needs an interactive terminal (no pipes) to read the code without echoing it."));
      return;
    }

    process.stdout.write(promptText);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          process.exit(130);
          return;
        } else if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        } else if (char === "\u0008" || char === "\u007f") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          // Printable characters only -- drops arrow-key/escape sequences
          // instead of splicing their raw bytes into the code.
          value += char;
        }
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}

/** At least 20 characters and at least 4 words separated by `-` or spaces --
 * rules out anything a quick guess or a short dictionary attack could reach,
 * given this code isn't put through a slow hash (see the file header). */
function weaknesses(code) {
  const problems = [];
  if (code.length < 20) problems.push("at least 20 characters long");
  const words = code.split(/[-\s]+/).filter(Boolean);
  if (words.length < 4) problems.push("at least 4 words separated by - or spaces");
  return problems;
}

async function ownCodeFlow() {
  const first = (await readHiddenLine("Enter your code (hidden): ")).trim();
  const second = (await readHiddenLine("Type it again to confirm: ")).trim();

  if (first !== second) {
    console.error("");
    console.error("Those two entries didn't match. Nothing was saved -- run this again.");
    process.exitCode = 1;
    return;
  }

  const problems = weaknesses(first);
  if (problems.length > 0) {
    console.error("");
    console.error("That code is too weak:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("Nothing was saved -- run this again with a longer code.");
    process.exitCode = 1;
    return;
  }

  const secretValue = await hashCode(first);

  console.log("");
  console.log("Secret value for EDITOR_CODE_HASH (paste it when `wrangler secret put` asks).");
  console.log("The code itself is never printed -- make sure you (and Alya) still have it written down:");
  console.log("");
  console.log(`    ${secretValue}`);
  console.log("");
}

async function randomCodeFlow() {
  const code = generateRandomCode();
  const secretValue = await hashCode(code);

  console.log("");
  console.log("Give this code to Ammar and Alya. Write it down somewhere safe --");
  console.log("it will not be shown again, and this script never saves it to disk:");
  console.log("");
  console.log(`    ${code}`);
  console.log("");
  console.log("Secret value for EDITOR_CODE_HASH (paste it when `wrangler secret put` asks):");
  console.log("");
  console.log(`    ${secretValue}`);
  console.log("");
}

async function main() {
  const useOwnCode = process.argv.includes("--own");
  if (useOwnCode) {
    await ownCodeFlow();
  } else {
    await randomCodeFlow();
  }
}

main().catch((err) => {
  console.error("");
  console.error(err.message);
  process.exitCode = 1;
});
