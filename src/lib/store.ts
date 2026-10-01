import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { get, put, list } from "@vercel/blob";
import { type Lesson, type Progress } from "./lesson";

export type StoredLesson = {
  id: string;
  lesson: Lesson;
  createdAt: string;
  revision: string;
};
const validId = /^[a-f0-9-]{36}$/;
export function checkId(id: string) {
  if (!validId.test(id)) throw new Error("Invalid lesson or session ID.");
}
function useBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) throw new Error("Hosted storage is not configured.");
  return false;
}
async function write(path: string, value: unknown) {
  if (useBlob()) {
    await put(path, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  } else {
    const file = join(process.cwd(), ".data", path);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, JSON.stringify(value));
  }
}
async function read<T>(path: string): Promise<T | null> {
  if (useBlob()) {
    const blob = await get(path, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    return JSON.parse(await new Response(blob.stream).text()) as T;
  }
  try {
    return JSON.parse(
      await readFile(join(process.cwd(), ".data", path), "utf8"),
    ) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function createLesson(lesson: Lesson): Promise<StoredLesson> {
  const record = {
    id: randomUUID(),
    lesson,
    createdAt: new Date().toISOString(),
    revision: randomUUID(),
  };
  await write(`lessons/${record.id}.json`, record);
  return record;
}
export async function getLesson(id: string) {
  checkId(id);
  return read<StoredLesson>(`lessons/${id}.json`);
}
export async function replaceLesson(id: string, lesson: Lesson) {
  const old = await getLesson(id);
  if (!old) throw new Error("Lesson not found.");
  const record = { ...old, lesson, revision: randomUUID() };
  await write(`lessons/${id}.json`, record);
  return record;
}
export async function saveProgress(
  lessonId: string,
  revision: string,
  progress: Progress,
) {
  checkId(lessonId);
  checkId(progress.sessionId);
  checkId(revision);
  await write(
    `results/${lessonId}/${revision}/${progress.sessionId}.json`,
    progress,
  );
}
export async function getResults(lessonId: string) {
  const record = await getLesson(lessonId);
  if (!record) throw new Error("Lesson not found.");
  const prefix = `results/${lessonId}/${record.revision}/`;
  let paths: string[];
  if (useBlob()) {
    paths = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 100 });
      paths.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else {
    try {
      paths = (await readdir(join(process.cwd(), ".data", prefix))).map(
        (f) => prefix + f,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      paths = [];
    }
  }
  const sessions = (
    await Promise.all(paths.map((path) => read<Progress>(path)))
  ).filter((p): p is Progress => p !== null);
  sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    lessonId,
    title: record.lesson.title,
    sessions,
    wordsToPractice: record.lesson.words
      .filter((w) =>
        sessions[0]?.attempts.some(
          (a) => a.wordId === w.id && (!a.correct || a.hinted),
        ),
      )
      .map((w) => w.spelling),
  };
}
