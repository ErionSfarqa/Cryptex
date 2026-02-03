import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import AdminDashboard from "@/components/AdminDashboard";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

export default async function Admin99PanelPage() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("admin99")?.value === "1";
  if (!unlocked) {
    redirect("/admin99");
  }

  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Admin Panel" />
      <div className="flex items-center justify-end">
        <AdminLogoutButton />
      </div>
      <AdminDashboard />
    </div>
  );
}
