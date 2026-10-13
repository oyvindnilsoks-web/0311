#!/usr/bin/env node
// Lokal nettside for ElevenLabs tekst-til-tale. Ingen avhengigheter, Node 18+.
// Start med: node server.mjs  (åpne http://localhost:3000)
// API-nøkkelen leses fra .env og forlater aldri serveren.

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";

const API = "https://api.elevenlabs.io/v1";
const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George (gratis å bruke via API)

loadDotEnv();
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Mangler ELEVENLABS_API_KEY. Legg den i .env eller som miljøvariabel.");
  process.exit(1);
}

const page = readFileSync(new URL("./public/index.html", import.meta.url));

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (req.method === "GET" && pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page);
    } else if (req.method === "GET" && pathname === "/api/voices") {
      const r = await fetch(`${API}/voices`, { headers: { "xi-api-key": apiKey } });
      if (!r.ok) return sendError(res, r.status, await r.text());
      const { voices } = await r.json();
      sendJson(res, 200, voices.map((v) => ({ id: v.voice_id, name: v.name })));
    } else if (req.method === "POST" && pathname === "/api/tts") {
      const { text, voice, model } = JSON.parse(await readBody(req));
      if (!text?.trim()) return sendError(res, 400, "Ingen tekst oppgitt.");
      const r = await fetch(`${API}/text-to-speech/${encodeURIComponent(voice || DEFAULT_VOICE)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: model || "eleven_multilingual_v2" }),
      });
      if (!r.ok) return sendError(res, r.status, await r.text());
      res.writeHead(200, { "Content-Type": "audio/mpeg" }).end(Buffer.from(await r.arrayBuffer()));
    } else {
      sendError(res, 404, "Ikke funnet");
    }
  } catch (err) {
    sendError(res, 502, `${err.message}${err.cause ? `: ${err.cause.message ?? err.cause}` : ""}`);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Åpne http://localhost:${PORT}`));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error("For stor forespørsel"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function loadDotEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
