# Spelling Quest

A single-child spelling POC for grades 2–5. Agents author lessons; the app has no LLM, generation endpoint, or model API key.

## Practice

- 1–25 words in short story chapters, with 1–5 words per chapter.
- Read the story → type missing letters → spell whole words → review up to five missed or hinted words. Correct answers advance immediately with one Enter press; mistakes stay for a typed correction.
- Browser pronunciation of individual words, hints, points without penalties, browser resume, and a completion summary.
- No accounts, profiles, or parent dashboard.
- Sample quest: **The Secret Sparkle Parade**, using all 25 supplied words.
- Sample/import progress stays in the browser. Agent-submitted lessons and results use private Vercel Blob storage.

## Develop

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Use Node.js 24 or newer. Without `BLOB_READ_WRITE_TOKEN`, development uses the ignored `.data/` directory. Hosted deployments require a private Blob store. See `.env.example` for settings. Never commit `.env.local`.

## 1Password

Generate an app-specific token directly in 1Password:

```sh
op item create --category=Password --title="Spelling Quest MCP" \
  --vault=Private --generate-password=letters,digits,48 \
  --url=https://spelling-bee-omega.vercel.app
```

Put a secret reference in `.env.1password`, without storing the value:

```dotenv
AGENT_KEY=op://Private/Spelling Quest MCP/password
```

```sh
op run --env-file=.env.1password -- npm run dev
```

Vercel functions need the resolved token in their encrypted `AGENT_KEY` production setting. With the user's explicit authorization, run `python3 scripts/configure-vercel-secret.py`. It reads through `op read` and sends the value to the linked Vercel project's production environment over stdin, without printing it or writing it to disk. Redeploy afterward.

## Muse integration

Muse does not currently support arbitrary native MCP connections. Its VM can run the dependency-free client at `/muse-client.py` when asked. The script initializes Streamable HTTP MCP, negotiates the protocol version, handles JSON/SSE responses, and authenticates with an `Authorization: Bearer` header.

Set `SPELLING_MCP_URL` to `https://spelling-bee-omega.vercel.app/api/mcp`. Provide `SPELLING_AGENT_KEY` securely in the VM environment, or set `SPELLING_AGENT_KEY_REF` to an authorized `op://…` reference if 1Password CLI is available in that VM. Never put the secret in a URL, source file, or command argument.

```sh
python3 muse-client.py tools
python3 muse-client.py schema
# Muse authors lesson.json from the returned contract.
python3 muse-client.py validate --lesson lesson.json
python3 muse-client.py create --lesson lesson.json
# Open the lessonUrl, practice, then:
python3 muse-client.py results --id LESSON_UUID
```

| MCP tool | Purpose |
| --- | --- |
| `get_lesson_schema` | Instructions, JSON Schema, valid example |
| `validate_lesson` | Validate structure, letter spans, story coverage |
| `create_lesson` | Save content and return a child lesson URL |
| `replace_lesson` | Replace content with a new revision |
| `get_results` | Read anonymous attempts, points, status, words needing practice |

Create a new lesson for follow-ups to preserve earlier results. Replacing content resets the current revision; children with an old revision must reload before saving results.

## Contract

The schema is in `src/lib/lesson.ts` and readable at `/api/schema`.

- Unique word IDs and exact spellings, without inflection changes.
- Each target appears exactly once as a `{ "wordId": "…" }` story token. Spaces/punctuation go in `{ "text": "…" }` tokens; plain text cannot contain target words.
- `capitalize: true` changes only display capitalization.
- `trickySpans` has zero-based, end-exclusive indexes, sorted and non-overlapping, leaving at least one letter visible.
- Several missing spans concatenate in order for the child's answer.
- Checking ignores case and outer whitespace; internal spelling is exact.
- Missing groups should practice digraphs, consonant blends, doubled consonants, silent letters, and vowel teams; avoid defaulting to a single obvious vowel.
- Agents supply an age-appropriate story, spelling hints, definitions, and a theme. Avoid identifying information about the child.

## Hosting and limits

`vercel.json` explicitly selects Next.js. Link a private Blob store and set `AGENT_KEY` in production. `APP_URL` overrides the lesson-link origin; otherwise it uses Vercel's production URL. Keep preview deployment protection enabled and make the production domain reachable by the child and Muse's VM.

This is a practice tool, not a tamper-proof assessment. The browser receives all answers. Child links contain unguessable lesson IDs and act as capabilities: anyone holding one can play and submit results. The Bearer token is required to author content and read results. There is one agent token and no OAuth.

Pronunciation depends on browser/device voices; homographs such as “refuse” can sound wrong. Hints and story context remain available. Browser saves survive refresh on the same device. Imports are browser-only. If remote saving fails, progress is kept locally with a retry button; revisiting the lesson retries the save. The agent's summary suggests words that needed help even if review was correct. Stored lessons and sessions have no automatic cleanup in this POC.
