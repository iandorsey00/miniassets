import { AppShell } from "@/components/app-shell";
import { getViewerContext } from "@/lib/data";

export async function AuthenticatedShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getViewerContext();

  return (
    <AppShell
      appName={context.dictionary.appName}
      appSubtitle={context.dictionary.appSubtitle}
      dictionary={context.dictionary}
      user={{
        displayName: context.user.displayName,
        role: context.user.role,
      }}
      memberships={context.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        role: membership.role,
        workspace: {
          id: membership.workspace.id,
          name: membership.workspace.name,
        },
      }))}
      currentWorkspaceId={context.currentWorkspace?.id}
    >
      {children}
    </AppShell>
  );
}
