# ElevenLabs tekst-til-tale

Liten kommandolinje-motor som sender tekst til ElevenLabs og lagrer lydfilen. Ingen avhengigheter, krever Node 18+.

## Oppsett

```sh
cp .env.example .env   # legg inn ELEVENLABS_API_KEY
```

## Nettside

```sh
node server.mjs   # åpne http://localhost:3000
```

Lim inn tekst, velg stemme, trykk «Lag lyd», og spill av eller last ned mp3. API-nøkkelen blir på serveren og sendes aldri til nettleseren. Serveren lytter bare på `127.0.0.1`.

## Kommandolinje

```sh
node tts.mjs "Hei, dette er en test"
node tts.mjs --file tekst.txt --out hilsen.mp3
echo "Tekst fra stdin" | node tts.mjs
node tts.mjs --voices                      # list stemmer og ID-er
node tts.mjs "Hei" --voice <id> --stability 0.4 --similarity 0.8
```

Lydfiler havner i `output/` hvis du ikke oppgir `--out`. Se toppen av `tts.mjs` for alle valg.
