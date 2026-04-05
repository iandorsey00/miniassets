"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AssetIcon, DashboardIcon, ExportIcon, LocationIcon, LogoutIcon, PencilIcon, SearchIcon, SwitchIcon } from "@/components/icons";
import { logoutAction, switchWorkspaceAction } from "@/lib/actions";

type ShellProps = {
  appName: string;
  appSubtitle: string;
  dictionary: {
    nav: {
      dashboard: string;
      assets: string;
      locations: string;
      export: string;
      createAsset: string;
      logout: string;
      switchWorkspace: string;
      workspaces: string;
    };
    common: {
      search: string;
      footerLine: string;
    };
  };
  user: {
    displayName: string;
    role: "ADMIN" | "USER";
  };
  memberships: Array<{
    workspaceId: string;
    role: "ADMIN" | "MEMBER";
    workspace: {
      id: string;
      name: string;
    };
  }>;
  currentWorkspaceId?: string | null;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/" || pathname.startsWith("/dashboard");
  }
  return pathname.startsWith(href);
}

export function AppShell({
  appName,
  appSubtitle,
  dictionary,
  user,
  memberships,
  currentWorkspaceId,
  children,
}: ShellProps) {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const hasMultipleWorkspaces = memberships.length > 1;
  const currentWorkspaceName =
    memberships.find((membership) => membership.workspaceId === currentWorkspaceId)?.workspace.name ??
    memberships[0]?.workspace.name ??
    "";

  const navItems = [
    { href: "/dashboard", label: dictionary.nav.dashboard, icon: DashboardIcon },
    { href: "/assets", label: dictionary.nav.assets, icon: AssetIcon },
    { href: "/locations", label: dictionary.nav.locations, icon: LocationIcon },
    { href: "/export", label: dictionary.nav.export, icon: ExportIcon },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <Link href="/dashboard" className="brand-link">
            <span className="brand-title">{appName}</span>
            {appSubtitle ? <span className="brand-subtitle">{appSubtitle}</span> : null}
          </Link>
        </div>
        <nav className="nav-list" aria-label={appName}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
            >
              <item.icon className="nav-link-icon" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <form action="/assets" className="header-search">
            <label htmlFor="header-search" className="sr-only">
              {dictionary.common.search}
            </label>
            <SearchIcon className="search-icon" />
            <input id="header-search" name="q" placeholder={dictionary.common.search} />
            {currentWorkspaceId ? <input type="hidden" name="workspaceId" value={currentWorkspaceId} /> : null}
          </form>

          {hasMultipleWorkspaces ? (
            <div className="workspace-switcher-cluster">
              <form action={switchWorkspaceAction} className="workspace-switcher" id="workspace-switcher-form">
                <label htmlFor="workspaceId" className="sr-only">
                  Workspace
                </label>
                <select id="workspaceId" name="workspaceId" defaultValue={currentWorkspaceId ?? ""}>
                  {memberships.map((membership) => (
                    <option key={membership.workspace.id} value={membership.workspace.id}>
                      {membership.workspace.name}
                    </option>
                  ))}
                </select>
              </form>
              <button type="submit" className="ghost-button workspace-switch-button" form="workspace-switcher-form">
                <span className="button-content">
                  <SwitchIcon className="button-icon" />
                  <span>{dictionary.nav.switchWorkspace}</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="workspace-label" aria-label={dictionary.nav.workspaces}>
              {currentWorkspaceName}
            </div>
          )}

          <div className="topbar-actions">
            <div className="user-chip"><span>{user.displayName}</span></div>
            <form action={logoutAction}>
              <button type="submit" className="ghost-button">
                <span className="button-content">
                  <LogoutIcon className="button-icon" />
                  <span>{dictionary.nav.logout}</span>
                </span>
              </button>
            </form>
          </div>
        </header>

        <main className="content">{children}</main>
        <footer className="shell-footer">
          <span>{dictionary.common.footerLine.replace("{year}", String(currentYear))}</span>
        </footer>

        {!pathname.startsWith("/assets/new") ? (
          <Link href="/assets/new" className="floating-action">
            <PencilIcon className="floating-action-icon" />
            <span>{dictionary.nav.createAsset}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
