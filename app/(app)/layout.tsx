import Sidebar from "@/components/Sidebar";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: string | undefined;
  const adminOnly = false;
  try {
    const supabase = await createSupabaseServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (profile?.role ?? "").toLowerCase() === "admin" || (profile?.role ?? "") === "ADMIN" ? "admin" : undefined;
    }
  } catch {
    role = undefined;
  }

  return (
    <div className="page-bg min-h-screen px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl gap-6">
        <Sidebar role={role} adminOnly={adminOnly} />
        <main className="flex-1 min-w-0">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
