import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ProjectClient from "./project-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { id } = await params;
  return <ProjectClient projectId={id} />;
}
