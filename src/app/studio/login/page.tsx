import { cookies } from "next/headers";
import { FLOW_UID_COOKIE } from "@/lib/auth";
import LoginForm from "@/components/studio/LoginForm";

// Magic-link login for the studio (PRD §5). If the visitor arrived from the
// guided flow they carry a signed `flow_uid` cookie — show the lighter
// "keep your ads" copy rather than a cold returning-user login.
export default async function StudioLoginPage() {
  const store = await cookies();
  const fromFlow = Boolean(store.get(FLOW_UID_COOKIE)?.value);
  return <LoginForm fromFlow={fromFlow} />;
}
