#!/usr/bin/env node
// ElevenLabs tekst-til-tale. Ingen avhengigheter, krever Node 18+.
//
// Bruk:
//   node tts.mjs "Hei, dette er en test"
//   node tts.mjs --file tekst.txt --out hilsen.mp3
//   echo "Tekst fra stdin" | node tts.mjs
//   node tts.mjs --voices            # list tilgjengelige stemmer
//
// Valg:
//   --voice <id>     Stemme-ID (standard: ELEVENLABS_VOICE_ID eller Rachel)
//   --model <id>     Modell (standard: eleven_multilingual_v2)
//   --format <fmt>   Lydformat (standard: mp3_44100_128)
//   --out <fil>      Utfil (standard: output/<tidsstempel>.mp3)
//   --stability <0-1>, --similarity <0-1>, --style <0-1>

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const API = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel

loadDotEnv();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    file: { type: "string" },
    out: { type: "string" },
    voice: { type: "string" },
    model: { type: "string" },
    format: { type: "string" },
    stability: { type: "string" },
    similarity: { type: "string" },
    style: { type: "string" },
    voices: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 18).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) fail("Mangler ELEVENLABS_API_KEY. Legg den i .env eller som miljøvariabel.");

if (values.voices) {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": apiKey } });
  await assertOk(res);
  const { voices } = await res.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}`);
  process.exit(0);
}

const text = await getText();
if (!text.trim()) fail("Ingen tekst oppgitt. Gi tekst som argument, --file eller via stdin.");

const voice = values.voice ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE;
const format = values.format ?? "mp3_44100_128";
const ext = format.startsWith("mp3") ? "mp3" : format.startsWith("pcm") ? "pcm" : format.split("_")[0];
const out = values.out ?? join("output", `${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`);

const voice_settings = {};
if (values.stability) voice_settings.stability = Number(values.stability);
if (values.similarity) voice_settings.similarity_boost = Number(values.similarity);
if (values.style) voice_settings.style = Number(values.style);

const res = await fetch(`${API}/text-to-speech/${voice}?output_format=${format}`, {
  method: "POST",
  headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/*" },
  body: JSON.stringify({
    text,
    model_id: values.model ?? process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
    ...(Object.keys(voice_settings).length && { voice_settings }),
  }),
});
await assertOk(res);

const audio = Buffer.from(await res.arrayBuffer());
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, audio);
console.log(`Lagret ${out} (${(audio.length / 1024).toFixed(1)} KB)`);

async function getText() {
  if (values.file) return readFileSync(values.file, "utf8");
  if (positionals.length) return positionals.join(" ");
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data;
  }
  return "";
}

async function assertOk(res) {
  if (res.ok) return;
  fail(`ElevenLabs svarte ${res.status}: ${await res.text()}`);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function loadDotEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
