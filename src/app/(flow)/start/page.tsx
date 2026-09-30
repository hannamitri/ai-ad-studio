import { Suspense } from "react";
import FlowShell from "@/components/flow/FlowShell";

// Screen 13's CTAs need BOOKING_URL / PRECALL_VIDEO_URL. These are non-secret
// URLs read server-side here and passed into the client FlowShell as props.
export default function StartPage() {
  const config = {
    bookingUrl: process.env.BOOKING_URL || undefined,
    precallVideoUrl: process.env.PRECALL_VIDEO_URL || undefined,
  };

  return (
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-muted" />}>
      <FlowShell config={config} />
    </Suspense>
  );
}
