import type { Metadata } from "next";
import VerticalsClient from "./VerticalsClient";

export const metadata: Metadata = {
  title: "Verticals | Script Coach",
  description: "Define your verticals and ideal customer profiles to target better leads.",
};

export default function VerticalsPage() {
  return <VerticalsClient />;
}
