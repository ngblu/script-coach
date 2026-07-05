"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Upload,
  Building2,
  Globe,
  Phone,
  Tag,
  Zap,
  Sparkles,
  Trash2,
  MessageSquare,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { useLeads, addLead, deleteLead, updateLead } from "@/lib/leadsStore";
import type { Lead } from "@/lib/types";
import { cn, generateId, formatDate } from "@/lib/utils";

const INDUSTRIES = [
  "Plumbing",
  "HVAC",
  "Electrical",
  "Roofing",
  "Landscaping",
  "Pest Control",
  "Cleaning",
  "Auto Repair",
  "Dental",
  "Chiropractic",
  "Legal",
  "Real Estate",
  "General Contractor",
  "Painting",
  "Other",
];

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (score >= 60) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-red-400 bg-red-400/10 border-red-400/20";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Hot Lead";
  if (score >= 60) return "Warm Lead";
  return "Cold Lead";
}

function getStatusColor(status: Lead["status"]): string {
  switch (status) {
    case "new":
      return "text-primary bg-primary/10 border-primary/20";
    case "contacted":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "qualified":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "closed":
      return "text-text-muted bg-surface-hover border-border";
  }
}

function mockAuditScore(businessName: string): number {
  const hash = businessName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 35 + (hash % 66);
}

function generateTalkingPoints(lead: { businessName: string; industry: string; website: string }): string[] {
  const points: string[] = [];
  const industry = lead.industry || "local service";

  if (lead.website) {
    points.push(`Website presence detected at ${lead.website} — audit their page speed, mobile responsiveness, and SEO`);
  } else {
    points.push(`No website detected — huge opportunity to be their first professional online presence`);
  }

  switch (industry.toLowerCase()) {
    case "plumbing":
      points.push("Plumbers rely heavily on emergency calls — a fast, mobile-optimized site with click-to-call is critical");
      points.push("Google Maps ranking is essential — most plumbing leads come from 'plumber near me' searches");
      break;
    case "hvac":
      points.push("Seasonal demand spikes — need strong SEO for 'AC repair' in summer and 'furnace repair' in winter");
      points.push("Emergency service ads + fast-loading site = high conversion potential");
      break;
    case "roofing":
      points.push("Storm chasers dominate roofing SEO — local, trusted presence is a differentiator");
      points.push("Before/after photo galleries drive trust and conversions in roofing");
      break;
    case "landscaping":
      points.push("Visual portfolio is everything — high-quality project photos drive leads");
      points.push("Seasonal services (spring cleanup, fall leaf removal) create recurring lead opportunities");
      break;
    case "dental":
    case "chiropractic":
      points.push("Online booking integration is a must-have for healthcare — reduces friction for new patients");
      points.push("Reviews and testimonials heavily influence patient decisions");
      break;
    case "legal":
      points.push("Trust signals (reviews, case results, credentials) are critical for attorney websites");
      points.push("Practice area landing pages with strong local SEO capture high-intent searches");
      break;
    case "real estate":
      points.push("IDX integration for property listings is table stakes — speed and UX differentiate agents");
      points.push("Neighborhood guides and market reports build authority and capture organic traffic");
      break;
    default:
      points.push(`Most ${industry} businesses in the area have outdated websites — opportunity to stand out`);
      points.push("Mobile optimization is critical — over 60% of local searches happen on phones");
  }

  points.push(`${lead.businessName} likely gets leads through referrals — a professional site amplifies word-of-mouth`);
  return points;
}

export default function LeadsPage() {
  const leads = useLeads();
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [manualBusinessName, setManualBusinessName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualIndustry, setManualIndustry] = useState("");
  const [importError, setImportError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        l.businessName.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q) ||
        l.website.toLowerCase().includes(q) ||
        l.phone.includes(q)
    );
  }, [leads, searchQuery]);

  const handleCsvImport = () => {
    setImportError("");
    if (!csvText.trim()) {
      setImportError("Paste CSV data first");
      return;
    }

    const lines = csvText.trim().split("\n");
    if (lines.length < 1) {
      setImportError("No data found");
      return;
    }

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("business"));
    const websiteIdx = headers.findIndex((h) => h.includes("website") || h.includes("url") || h.includes("site"));
    const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("tel") || h.includes("mobile"));
    const industryIdx = headers.findIndex((h) => h.includes("industry") || h.includes("type") || h.includes("category"));

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const businessName = nameIdx >= 0 ? cols[nameIdx] : cols[0] || `Lead ${i}`;
      if (!businessName) continue;

      const website = websiteIdx >= 0 ? cols[websiteIdx] || "" : "";
      const phone = phoneIdx >= 0 ? cols[phoneIdx] || "" : "";
      const industry = industryIdx >= 0 ? cols[industryIdx] || "" : "";

      const lead: Lead = {
        id: generateId(),
        businessName,
        website,
        phone,
        industry,
        auditScore: mockAuditScore(businessName),
        talkingPoints: generateTalkingPoints({ businessName, industry, website }),
        pitch: "",
        status: "new",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      addLead(lead);
      imported++;
    }

    setCsvText("");
    setShowImport(false);
    if (imported === 0) {
      setImportError("No valid leads found in CSV");
    }
  };

  const handleManualAdd = () => {
    setImportError("");
    const name = manualBusinessName.trim();
    if (!name) {
      setImportError("Business name is required");
      return;
    }

    const lead: Lead = {
      id: generateId(),
      businessName: name,
      website: manualWebsite.trim(),
      phone: manualPhone.trim(),
      industry: manualIndustry,
      auditScore: mockAuditScore(name),
      talkingPoints: generateTalkingPoints({
        businessName: name,
        industry: manualIndustry,
        website: manualWebsite.trim(),
      }),
      pitch: "",
      status: "new",
      notes: "",
      createdAt: new Date().toISOString(),
    };
    addLead(lead);
    setManualBusinessName("");
    setManualWebsite("");
    setManualPhone("");
    setManualIndustry("");
    setShowImport(false);
  };

  const handleGeneratePitch = async (lead: Lead) => {
    setGeneratingFor(lead.id);
    try {
      const res = await fetch("/api/leads/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.businessName,
          website: lead.website,
          industry: lead.industry,
          talkingPoints: lead.talkingPoints,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate pitch");
      }

      const data = await res.json();
      updateLead(lead.id, { pitch: data.pitch });
    } catch (err: any) {
      alert(`Failed to generate pitch: ${err.message}`);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this lead?")) {
      deleteLead(id);
    }
  };

  const handleStatusChange = (id: string, status: Lead["status"]) => {
    updateLead(id, { status });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lead Pre-Qualification</h1>
          <p className="text-text-secondary text-sm mt-1">
            Import leads, get AI talking points, and generate personalized pitches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Leads
          </button>
        </div>
      </div>

      {/* Search */}
      {leads.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, industry, website, or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Stats row */}
      {leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Leads", value: leads.length, color: "text-text-primary" },
            {
              label: "Hot",
              value: leads.filter((l) => l.auditScore >= 80).length,
              color: "text-emerald-400",
            },
            {
              label: "Warm",
              value: leads.filter((l) => l.auditScore >= 60 && l.auditScore < 80).length,
              color: "text-amber-400",
            },
            {
              label: "With Pitch",
              value: leads.filter((l) => l.pitch).length,
              color: "text-primary",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <p className="text-xs text-text-muted mb-1">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-lg animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Leads</h2>
              <button onClick={() => setShowImport(false)} className="text-text-muted hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-400">
                {importError}
              </div>
            )}

            {/* Manual entry */}
            <div className="mb-6 p-4 bg-background border border-border rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Manual Entry
              </h3>
              <input
                type="text"
                value={manualBusinessName}
                onChange={(e) => setManualBusinessName(e.target.value)}
                placeholder="Business name *"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value)}
                  placeholder="Website URL"
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone number"
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                />
              </div>
              <select
                value={manualIndustry}
                onChange={(e) => setManualIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
              <button
                onClick={handleManualAdd}
                className="w-full py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add Lead
              </button>
            </div>

            {/* CSV import */}
            <div className="p-4 bg-background border border-border rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Paste CSV
              </h3>
              <p className="text-xs text-text-muted">
                First row should be headers. Columns: name/business, website/url, phone, industry/type
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Business Name,Website,Phone,Industry\nAcme Plumbing,acmeplumbing.com,555-0100,Plumbing\nSmith HVAC,smithhvac.com,555-0200,HVAC`}
                rows={6}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 font-mono resize-none"
              />
              <button
                onClick={handleCsvImport}
                disabled={!csvText.trim()}
                className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Import from CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads list */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No leads yet</h3>
          <p className="text-text-muted text-sm mb-6">
            Import leads via CSV or add them manually to get AI-powered talking points
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-surface border border-primary/20 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Your First Leads
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isExpanded = expandedLead === lead.id;
            return (
              <div
                key={lead.id}
                className="bg-surface border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/20"
              >
                {/* Lead card header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-text-primary truncate">
                          {lead.businessName}
                        </h3>
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                            getStatusColor(lead.status)
                          )}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                        {lead.website && (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {lead.website}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.industry && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {lead.industry}
                          </span>
                        )}
                        <span className="text-text-muted/60">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audit score badge */}
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold",
                          getScoreColor(lead.auditScore)
                        )}
                        title={getScoreLabel(lead.auditScore)}
                      >
                        <Zap className="w-3 h-3" />
                        {lead.auditScore}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-background/30 animate-fade-in">
                    {/* Talking points */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        AI Talking Points
                      </h4>
                      <ul className="space-y-1.5">
                        {lead.talkingPoints.map((point, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-primary mt-0.5 shrink-0">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Generated pitch */}
                    {lead.pitch && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-accent" />
                          Generated Pitch
                        </h4>
                        <div className="p-3 bg-surface border border-border rounded-lg">
                          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                            {lead.pitch}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                        Notes
                      </h4>
                      <textarea
                        value={lead.notes}
                        onChange={(e) => updateLead(lead.id, { notes: e.target.value })}
                        placeholder="Add notes about this lead..."
                        rows={2}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePitch(lead);
                        }}
                        disabled={generatingFor === lead.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                      >
                        {generatingFor === lead.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {generatingFor === lead.id ? "Generating..." : "Generate Pitch"}
                      </button>

                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead["status"])}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-primary/50"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(lead.id);
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-400/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
