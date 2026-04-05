import "@fontsource/inter/index.css";
import "@fontsource-variable/noto-sans-sc/index.css";

import type { Metadata } from "next";

import "@/app/globals.css";
import { accentTokenMap, themeTokenMap } from "@/lib/constants";
import { getPreferencesForLayout } from "@/lib/data";
import { formatLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "MiniAssets",
    template: "%s · MiniAssets",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferences = await getPreferencesForLayout();

  return (
    <html
      lang={formatLocale(preferences.locale)}
      data-theme={themeTokenMap[preferences.themePreference]}
      data-accent={accentTokenMap[preferences.accentColor]}
    >
      <body>{children}</body>
    </html>
  );
}
