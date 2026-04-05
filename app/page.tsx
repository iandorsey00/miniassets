import { redirect } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth-config";

export default function HomePage() {
  redirect(AUTH_ROUTES.postLogin);
}
