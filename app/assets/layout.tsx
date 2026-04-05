import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function AssetsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
