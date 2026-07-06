import type { Metadata } from "next";
import LiveClient from "./LiveClient";

export const metadata: Metadata = {
  title: "Live Coach | Script Coach",
  description: "Real-time coaching while you're on the call. Type what the prospect says, get instant tips.",
};

export default function LivePage() {
  return <LiveClient />;
}
