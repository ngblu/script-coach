import type { Metadata } from "next";
import ComplianceClient from "./ComplianceClient";

export const metadata: Metadata = {
  title: "Compliance | Script Coach",
  description:
    "Cold-calling rules by state and country: calling hours, DNC registries, recording consent, and pre-call checklists.",
};

export default function CompliancePage() {
  return <ComplianceClient />;
}
