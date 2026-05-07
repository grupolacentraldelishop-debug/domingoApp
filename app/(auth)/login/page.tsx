import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

// Suspense es requerido por Next.js 14 cuando un Client Component usa useSearchParams
export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
