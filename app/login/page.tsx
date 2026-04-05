import Link from "next/link";

import { getMiniAuthLoginUrl } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export default function LoginPage() {
  const dictionary = getDictionary("EN");

  return (
    <main className="content" style={{ minHeight: "100vh", alignContent: "center", maxWidth: "44rem", margin: "0 auto" }}>
      <section className="panel">
        <div className="page-header">
          <div>
            <h1>{dictionary.login.title}</h1>
            <p>{dictionary.login.body}</p>
          </div>
        </div>
        <div className="stack">
          <Link href={getMiniAuthLoginUrl()} className="button">
            {dictionary.login.action}
          </Link>
        </div>
      </section>
    </main>
  );
}
