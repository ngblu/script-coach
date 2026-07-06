import type { Metadata } from "next";
import PlaybooksClient from "./PlaybooksClient";

export const metadata: Metadata = {
  title: "Playbooks | Script Coach",
  description:
    "Bundle scripts, coaching cards, and ICP profiles into per-vertical playbooks ready for live calling.",
};

export default function PlaybooksPage() {
  return <PlaybooksClient />;
}
