 "use client";
 
 import { useState } from "react";
 import { useRouter } from "next/navigation";
 import TopNav from "@/components/TopNav";
 import Card from "@/components/ui/Card";
 import Input from "@/components/ui/Input";
 import Button from "@/components/ui/Button";
 
 export default function AdminLoginPage() {
   const [code, setCode] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const router = useRouter();
 
   const submit = async () => {
     setError(null);
     setLoading(true);
     try {
       const res = await fetch("/api/admin/access", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ code }),
       });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) {
         setError(data.error ?? "Invalid code.");
         setLoading(false);
         return;
       }
       router.push("/admin");
     } catch {
       setError("Request failed.");
       setLoading(false);
     }
   };
 
   return (
     <div className="flex flex-col gap-8">
       <TopNav title="Admin Login" />
       <Card className="flex flex-col gap-3">
         <span className="text-xs uppercase tracking-widest text-[var(--muted)]">Access Code</span>
         <Input
           placeholder="Enter admin code"
           value={code}
           onChange={(e) => setCode(e.target.value)}
         />
         {error ? <div className="text-sm text-rose-600">{error}</div> : null}
         <Button onClick={submit} disabled={loading}>
           {loading ? "Verifying..." : "Verify"}
         </Button>
       </Card>
     </div>
   );
 }
