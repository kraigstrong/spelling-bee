import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  authoringInstructions,
  lessonInputSchema,
  lessonSchema,
} from "@/lib/lesson";
import { appOrigin, validAgentKey } from "@/lib/auth";
import { createLesson, replaceLesson, getResults } from "@/lib/store";
import { demoLesson } from "@/lib/demo";

export const runtime = "nodejs";
const json = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  isError,
});
const lessonId = z.string().uuid();
const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_lesson_schema",
      {
        description:
          "Read the lesson contract, authoring instructions, and a valid example before generating a spelling lesson.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () =>
        json({
          instructions: authoringInstructions,
          schema: z.toJSONSchema(lessonInputSchema),
          example: demoLesson,
        }),
    );
    server.registerTool(
      "validate_lesson",
      {
        description:
          "Validate lesson content, character spans, and complete story word coverage before submission. Returns actionable errors without saving anything.",
        inputSchema: z.object({ lesson: lessonInputSchema }),
        annotations: { readOnlyHint: true },
      },
      async ({ lesson }) => {
        const parsed = lessonSchema.safeParse(lesson);
        return parsed.success
          ? json({ valid: true })
          : json({ valid: false, errors: parsed.error.issues }, true);
      },
    );
    server.registerTool(
      "create_lesson",
      {
        description:
          "Push an agent-authored spelling lesson. Returns a child-friendly lesson URL and lessonId to retrieve results. The app does no LLM processing.",
        inputSchema: z.object({ lesson: lessonInputSchema }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
        },
      },
      async ({ lesson }) => {
        const parsed = lessonSchema.safeParse(lesson);
        if (!parsed.success) return json({ errors: parsed.error.issues }, true);
        try {
          const record = await createLesson(parsed.data);
          return json({
            lessonId: record.id,
            lessonUrl: `${appOrigin()}/play/${record.id}`,
            words: record.lesson.words.length,
          });
        } catch {
          return json(
            { error: "Could not save the lesson. Please retry." },
            true,
          );
        }
      },
    );
    server.registerTool(
      "replace_lesson",
      {
        description:
          "Replace an existing lesson by ID, resetting its current results and browser practice state. Use create_lesson for a follow-up lesson so previous results are preserved.",
        inputSchema: z.object({ lessonId, lesson: lessonInputSchema }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
        },
      },
      async ({ lessonId, lesson }) => {
        const parsed = lessonSchema.safeParse(lesson);
        if (!parsed.success) return json({ errors: parsed.error.issues }, true);
        try {
          await replaceLesson(lessonId, parsed.data);
          return json({
            lessonId,
            lessonUrl: `${appOrigin()}/play/${lessonId}`,
          });
        } catch {
          return json(
            { error: "Lesson not found or could not be updated." },
            true,
          );
        }
      },
    );
    server.registerTool(
      "get_results",
      {
        description:
          "Read practice attempts, points, completion status, and words needing practice for a lesson. Sessions contain no child profile or identity.",
        inputSchema: z.object({ lessonId }),
        annotations: { readOnlyHint: true },
      },
      async ({ lessonId }) => {
        try {
          return json(await getResults(lessonId));
        } catch {
          return json(
            { error: "Lesson not found or results unavailable." },
            true,
          );
        }
      },
    );
  },
  {
    serverInfo: { name: "Spelling Quest", version: "0.1.0" },
    instructions: authoringInstructions,
  },
);

async function route(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (
    !validAgentKey(
      authorization.startsWith("Bearer ") ? authorization.slice(7) : "",
    )
  )
    return Response.json(
      { error: "A valid Authorization: Bearer header is required." },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="spelling-quest"' },
      },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 150_000)
    return Response.json({ error: "Request too large." }, { status: 413 });
  const response = await handler(request);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export { route as GET, route as POST, route as DELETE };
