import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Segunda checagem de sessão, desta vez em Server Component — o middleware já
// bloqueia isto antes de chegar aqui, mas manter a checagem aqui também é
// defesa em profundidade (por ex. se o matcher do middleware mudar um dia).
export default async function ShelfLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <div id="app">{children}</div>;
}
