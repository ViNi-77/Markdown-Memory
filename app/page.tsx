import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceData } from "@/lib/data";
import { MarkdownWorkspace } from "@/components/markdown/MarkdownWorkspace";
import { UserButton } from "@/components/auth/UserButton";
import { isWorkspaceRuntimeConfigured } from "@/lib/auth-runtime";

export default async function Page() {
  if (!isWorkspaceRuntimeConfigured()) {
    redirect("/demo");
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { folders, documents } = await getWorkspaceData();

  return (
    <MarkdownWorkspace
      initialFolders={folders}
      initialDocuments={documents}
      userSlot={<UserButton />}
    />
  );
}
