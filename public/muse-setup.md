# Spelling Quest: Muse VM workflow

Endpoint: https://spelling-bee-omega.vercel.app/api/mcp

Download https://spelling-bee-omega.vercel.app/muse-client.py to your task workspace. It is a small dependency-free Python client that handles MCP initialization, tool discovery, and JSON/SSE responses. Review the source before running it.

Authenticate using an app-specific Bearer token supplied securely by Kraig. Do not ask for unrelated credentials. Do not put the token in the URL, a command argument, generated lesson, source file, or long-term memory.

The client reads `SPELLING_AGENT_KEY` from its environment. If your VM has an authorized 1Password CLI session, you may use `SPELLING_AGENT_KEY_REF` pointing to the app-specific `op://…` reference instead. Do not claim a native Muse MCP connection; this workflow uses your VM when Kraig asks you to run it.

Set the non-secret `SPELLING_MCP_URL` environment variable to the endpoint above.

1. Run `python3 muse-client.py tools` to discover the tools.
2. Run `python3 muse-client.py schema` to obtain the authoring instructions and contract.
3. Author `lesson.json` with the user's exact words, grade, interests, short coherent story chapters, tricky letter spans, hints, and definitions. Select meaningful spelling patterns such as ch, ck, sh, th, silent letters, vowel teams, and double consonants (tt in attitude, ss in tissue); avoid mostly hiding single vowels. All content generation happens in Muse; the app does not call an LLM.
4. Run `python3 muse-client.py validate --lesson lesson.json`. Fix all reported errors.
5. Run `python3 muse-client.py create --lesson lesson.json`. Return the lesson URL and keep the lesson ID in this task's files.
6. After Kraig says practice is finished, run `python3 muse-client.py results --id LESSON_UUID` and explain which words could use more practice. With his request, create a new follow-up lesson focused on them.

Do not replace an existing lesson for follow-ups unless Kraig specifically asks to edit it; create a new one to preserve previous results.

If authentication is not yet configured, wait for the app-specific token. As a fallback, return validated lesson JSON for Kraig to paste at https://spelling-bee-omega.vercel.app/connect. This browser preview does not send results back to the agent.

A sample with Kraig's 25 words is at https://spelling-bee-omega.vercel.app/sample-lesson.json. Its public practice link is https://spelling-bee-omega.vercel.app/play/demo. The sample's progress is browser-only; submit the JSON through `create` to test result retrieval.
