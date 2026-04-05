import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function ExportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
