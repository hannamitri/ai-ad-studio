import { redirect } from "next/navigation";
import Studio from "@/components/studio/Studio";
import { createClient } from "@/lib/supabase/server";

// The bookmarkable studio tool (PRD §5). Requires a Supabase session; visitors
// with only a flow_uid cookie (arrived from the guided flow) are sent to
// /studio/login, which shows the light-login copy. See PRD §5 + §7.
export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/studio/login");
  }

  return (
    <Studio email={user.email ?? ""} programUrl={process.env.PROGRAM_URL ?? ""} />
  );
}
