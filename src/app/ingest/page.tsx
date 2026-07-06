import type { Metadata } from "next";
import IngestClient from "./IngestClient";

export const metadata: Metadata = {
  title: "Feed the Brains | Script Coach",
  description:
    "Upload transcripts, documents, and call recordings to teach your Market, Leads, and Coaching Brains.",
};

export default function IngestPage() {
  return <IngestClient />;
}
