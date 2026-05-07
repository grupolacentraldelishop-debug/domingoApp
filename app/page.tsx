import { redirect } from "next/navigation";

export default function Home() {
  // Redirige al área autenticada; el middleware decide si pasa a login
  redirect("/eventos");
}
