import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function LocationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
