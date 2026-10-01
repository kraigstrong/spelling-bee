import { z } from "zod";
import { authoringInstructions, lessonInputSchema } from "@/lib/lesson";
import { demoLesson } from "@/lib/demo";
export function GET() {
  return Response.json({
    instructions: authoringInstructions,
    schema: z.toJSONSchema(lessonInputSchema),
    example: demoLesson,
  });
}
