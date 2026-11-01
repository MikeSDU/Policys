# Company Policy Assistant — Assignment 1

Three comparable approaches over the supplied **98 policies**: deterministic keyword search, Gemini with the entire database and Gemini with a TF-IDF cosine vector index. Includes a website and a Slack mention bot. All model calls happen server-side. The API key is never sent to the browser.

## GitHub-upload og Render

1. Pak ZIP-filen ud. Opret et GitHub-repository, fx `company-policy-assistant`.
2. Vælg **Add file → Upload files**. Upload **indholdet** af `policy-assistant` direkte til repositoryets rod: `package.json`, `server.mjs`, `core.mjs`, CSV-filen, `public`-mappen og resten af filerne. Upload ikke ZIP-filen som eneste fil. Sørg for, at `public`-mappen bevares. Upload aldrig en udfyldt `.env` eller nøgler.
3. På Render: **New → Web Service**, forbind GitHub-repositoryet og vælg **Node**.
4. Build Command: `npm install --omit=optional`. Start Command: `npm start`. Root Directory skal være tom, hvis filerne ligger i roden. Hvis du uploadede hele projektmappen, vælg `policy-assistant` som Root Directory.
5. Tilføj miljøvariablen **GEMINI_API_KEY** med din nøgle i Render → Environment. Sæt **GEMINI_MODEL** til `gemini-2.5-flash`. Modellen kan udskiftes med en tilgængelig tekstmodel, der understøtter JSON-output. Del aldrig nøglen i kode, GitHub eller screenshots.
6. Deploy. Render giver et `https://…onrender.com`-link. `render.yaml` kan alternativt bruges med **New → Blueprint**; den spørger efter Gemini-nøglen.
7. Test spørgsmålene på siden. Hvis Gemini svarer med 429, kontrollér kontoens kvote. Hvis modellen ikke er tilgængelig, ret `GEMINI_MODEL` til en model fra din Google AI Studio-konto. Gratis Render-tjenester kan skulle starte op efter inaktivitet.

Projektet er klargjort til hosting på Render efter dit valg. Der er ikke oprettet en separat Sites-udgave.

## Lokal kørsel og test

Installér Node.js 22 eller nyere. Fra projektmappen:

```powershell
npm install
$env:GEMINI_API_KEY = 'din-noegle'
npm start
```

Åbn `http://localhost:3000`. Kør `npm test` for testene. `.env.example` er kun en skabelon: appen læser miljøvariabler, og indlæser ikke `.env` automatisk. Node kan indlæse en lokal fil med `node --env-file=.env server.mjs`; filen skal forblive lokal.

## Slack-bot

1. Opret et separat Slack-workspace med dit navn/studie-ID og en testkanal, fx `assignment1-dit-navn`.
2. På https://api.slack.com/apps opret en app **From a manifest**, vælg dette workspace og indsæt `slack-manifest.json`.
3. Installér appen i workspace. Bot Token Scopes skal være `app_mentions:read` og `chat:write`. Gem bot-tokenet (`xoxb-…`) som `SLACK_BOT_TOKEN`.
4. Under **Basic Information → App-Level Tokens** generér et token med `connections:write`, og gem det (`xapp-…`) som `SLACK_APP_TOKEN`. Socket Mode skal være slået til.
5. Invitér botten til testkanalen. Kør nedenstående lokalt, og behold terminalen åben:

```powershell
npm install
$env:GEMINI_API_KEY = 'din-noegle'
$env:SLACK_BOT_TOKEN = 'xoxb-din-token'
$env:SLACK_APP_TOKEN = 'xapp-din-token'
npm run slack
```

6. Skriv fx `@Policy Assistant How many vacation days do employees receive?`. Botten bruger TF-IDF + Gemini og svarer i en tråd med politiknavn, afdeling og evidens.
7. Tag et screenshot af dit spørgsmål og bot-svaret i kanalen. Invitér underviseren **raz@sdu.dk** til workspace og testkanalen som beskrevet i opgaven. Invitationen er en afleveringshandling, du selv skal udføre; den er ikke sendt af projektet.

Permanent hosting af Slack-processen er ikke nødvendig. Render-websitet kører separat og kræver ingen Slack-tokens. Hvis du kun har installeret webafhængigheder med `--omit=optional`, kør almindelig `npm install` før Slack-botten.

## Sammenligning og evaluering

Siden indeholder præcis to engelske afsnit under “The comparison”, også i `comparison.md`, som udgangspunkt for afleveringen. Der er ikke opfundet resultater. Tilpas konklusionen efter dine egne forsøg.

- Rules: antal fælles unikke ord med faste stopord; første policy vinder ved pointlighed. Ingen LLM-tokens. Svaret er et ordret uddrag, men kan være irrelevant.
- Uden indeks: alle 98 records i prompten. Dette er en LLM med fuld kontekst, ikke en LLM uden adgang til politikkerne.
- Med indeks: sparse TF-IDF-vektorer beregnes én gang ved opstart, normaliseres og søges med cosine similarity. Op til fem positive matches sendes til Gemini. Dette er et reelt leksikalt vektorindeks; det bruger ikke en ekstern embeddingmodel eller embeddingtokens. Synonymer og danske søgeord kan give dårligere retrieval mod den engelske CSV.
- Samme model, temperatur og instruktioner til begge LLM-metoder. Svartid inkluderer lokal forbehandling og netværk. LLM-kald køres parallelt. Input/output/thinking/total vises som rapporteret af Gemini; total kan inkludere thinking. Manglende tal vises som N/A.
- Citater valideres mod de records, modellen fik. Citaternes eksistens er ikke en automatisk sandhedstest af svaret. Irrelevante svar og udokumenterede ekstra påstande skal vurderes manuelt. CSV'ens afdeling vises eksplicit.

Brug fx spørgsmålene herunder, gentag dem på samme model, og vurder hver metodes svar mod den oprindelige CSV:

1. How many vacation days do employees receive? (Vacation Policy: 15; afdeling IT)
2. Can employees work abroad? (Work From Abroad Policy: op til 30 dage med godkendelse)
3. How often must passwords be changed? (Password Policy: hver 90. dag og kompleksitetskrav)
4. When must travel expense receipts be submitted? (Travel Reimbursement Policy: 30 dage)
5. Does the company pay for pet insurance? (kontrollér manglende dækning i hele CSV)
6. Can I take 45 days abroad without approval? (modstrid med politikken)
7. Can I do my job from another country? (parafrase til retrieval-test)
8. What is the CEO's home address? (ikke besvaret af databasen)

Markér svarene på siden og download hver kørsel som JSON. Rapportér for hver metode: antal spørgsmål, andel svar med mindst én udokumenteret eller irrelevant påstand, antal korrekte/ukorrekte afståelser og gennemsnitlig svartid/tokenforbrug. En fejl fra API tæller som en fejl, ikke som et understøttet svar eller en afståelse. Projektet beregner ikke automatisk en hallucinationsrate. Downloaden gemmes kun på din computer; vurderinger er ikke varigt gemt på serveren.

## Aflevering

- Render-link og GitHub-link.
- Præcis to afsnit om sammenligning og foretrukken tilgang, revideret efter test.
- Screenshot af Slack-botten i den identificerbare testkanal.
- Separat workspace/kanal med studentens identitet og invitation til underviseren.

## Kilder og driftsgrænser

- Gemini REST og tokenmetadata: https://ai.google.dev/api/generate-content
- Render-deployment: https://render.com/docs/deploy-node-express-app
- Slack Socket Mode: https://docs.slack.dev/tools/bolt-python/concepts/socket-mode/ (koncept) og https://docs.slack.dev/tools/bolt-js/concepts/socket-mode/ (JavaScript).

Der medfølger ingen nøgle. Gemini- og Slack-kald kan først ende-til-ende-testes med dine egne nøgler. Den offentlige demo har inputgrænser og højst tre samtidige sammenligninger pr. serverproces, men ingen login eller vedvarende kvote pr. bruger. Brug en separat nøgle med passende API-kvote til demoen. Appen gemmer ikke spørgsmål; Gemini modtager spørgsmål og policykontekst, og Slack modtager bot-svaret.
