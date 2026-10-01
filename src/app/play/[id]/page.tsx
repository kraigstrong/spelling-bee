import { notFound } from "next/navigation";
import { Quest } from "@/components/quest";
import { featuredLesson } from "@/lib/featured";
import { getLesson } from "@/lib/store";
export const dynamic = "force-dynamic";
export default async function Play({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "demo")
    return <Quest lesson={featuredLesson} lessonId="demo" revision="demo-v2" />;
  if (id === "local")
    return <Quest lesson={null} lessonId="local" revision="local" />;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const record = await getLesson(id);
  if (!record) notFound();
  return (
    <Quest lesson={record.lesson} lessonId={id} revision={record.revision} />
  );
}
