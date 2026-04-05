import Link from "next/link";

import { getMiniAuthLoginUrl } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export default function LoginPage() {
  const dictionary = getDictionary("EN");

  return (
    <div className="auth-page">
      <div className="auth-card">
        <section className="hero-card">
          <span className="login-brand">
            <span className="subtitle-only">{dictionary.appName}</span>
            <span className="login-brand-subtitle">{dictionary.appSubtitle}</span>
          </span>
        </section>

        <section className="login-card">
          <div className="stack">
            <h2>{dictionary.login.title}</h2>
            <p className="muted">{dictionary.login.body}</p>
            <Link href={getMiniAuthLoginUrl()} className="button">
              {dictionary.login.action}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
