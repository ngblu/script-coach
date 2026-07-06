"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Plus, FileText, TrendingUp, Target, MessageSquare, Download } from "lucide-react";
import { useScripts, deleteScript, addScript } from "@/lib/store";
import type { Script } from "@/lib/types";
import { cn, formatDate, generateId } from "@/lib/utils";
import ScriptCard from "@/components/dashboard/ScriptCard";
import StatsBar from "@/components/dashboard/StatsBar";

const SAMPLE_SCRIPTS: { title: string; content: string }[] = [
  {
    title: "1. Free Audit Hook",
    content: `[INTRO]
Hey, this is Noah with 555 Digital. Did I catch you at a bad time? Good. Look, I'm going to be straight with you - I just ran a quick scan on your website and found a few things that are probably costing you leads. Want me to show you?

[THE PROBLEM]
Most small business websites load slow, aren't showing up on Google, and don't have a clear path for customers to call or book. That's money walking out the door every single day. Your competitors with better sites are taking the calls that should be yours.

[VALUE PROP]
I fix that. I build websites that actually bring in leads - fast, shows up on Google, and makes it dead simple for customers to contact you. I've got a plumber right now getting 3-4 qualified leads a week from his site alone.

[OBJECTIONS]
"I'm happy with my current site" - Totally fair. But when was the last time you checked how it looks on a phone? Or how fast it loads? Most people I talk to haven't looked at their own site in months. Let me show you what I found.

"We don't have the budget right now" - I get it. Here's the thing - if your site isn't bringing in leads, it's not an expense, it's already costing you. One new customer covers the whole project.

[CLOSE]
Tell you what - let me do a free audit of your site. Takes me 10 minutes, no commitment. I'll send you a report showing exactly how many leads you're losing, how your site ranks, and what it'd take to fix it. Worst case, you get free intel. Sound fair?`,
  },
  {
    title: "2. Competitor Gap",
    content: `[INTRO]
Hey it's Noah from 555 Digital, how's your day going? Quick question - when's the last time you Googled your own business? Like actually searched for what your customers are searching for?

[THE PROBLEM]
Here's what I'm seeing in your area: your top 3 competitors all have modern websites that load in under 2 seconds. One of them is ranking for 12 different keywords you're not even showing up for. They're basically running a 24/7 salesperson while your site sits there doing nothing.

[VALUE PROP]
I help local businesses close that gap. I build sites that load fast, rank on Google, and actually convert. My clients typically see a 2-3x increase in website leads within the first 60 days after launch.

[OBJECTIONS]
"We get plenty of work through word of mouth" - That's great, and that's exactly why this works so well. You've already got the reputation. A good website just amplifies it. Think of it as your word of mouth working while you sleep.

"Isn't a website expensive?" - Depends what you compare it to. My landing page starts at $1,000. That's one small job. And it keeps bringing in leads for years. Pretty good ROI when you think about it that way.

[CLOSE]
Let me send you a quick side-by-side - your site versus your competitors. You'll see exactly where you're losing ground. No pitch, just data. Sound worth 5 minutes?`,
  },
  {
    title: "3. Consultative (Not Selling)",
    content: `[INTRO]
Hi, Noah with 555 Digital. I know you're busy so I'll be quick. I work with local service businesses on their online presence, but I'm not calling to sell you anything today. I'm actually doing research on how businesses in your industry are handling their websites. Mind if I ask you two quick questions?

[THE CONVERSATION]
Question 1: On a scale of 1-10, how happy are you with the leads your website brings in right now?
Question 2: If you could wave a magic wand and fix one thing about your online presence, what would it be?

[VALUE PROP]
Interesting. You know, most of the people I talk to in your industry give similar answers. The good news is this is actually pretty fixable. I specialize in turning websites from "online brochures" into actual lead-generating machines.

[OBJECTIONS]
"I need to think about it" - Of course. I'm not asking for a decision today. What I'd love to do is just send you an audit of your current site with some specific recommendations. Use it or don't - no pressure. Fair?

[CLOSE]
Great. What's the best email to send that to? I'll have it to you by tomorrow. If anything in there looks interesting, we can chat. If not, you got a free audit out of it.`,
  },
  {
    title: "4. Blunt No-BS",
    content: `[INTRO]
Hey this is Noah with 555 Digital. I'm going to be direct because I know you're busy. Your website is probably costing you money and you don't even know it. Want to hear why or should I let you go?

[THE PROBLEM]
Here's the reality: if your site takes more than 3 seconds to load, 53% of people leave. If it's not mobile-friendly, Google buries it. And if there's no clear call-to-action on the homepage, people bounce without ever calling you. I see this on probably 8 out of 10 local business sites I look at.

[VALUE PROP]
I fix websites for a living. Not making them "pretty" - making them make you money. Every site I build is focused on one thing: getting the phone to ring. My clients don't care about design awards - they care about ROI.

[OBJECTIONS]
"I already paid someone to build my site" - I hear that a lot. And I'm not saying they did a bad job. I'm saying the game changed. Google's algorithm, mobile browsing, page speed expectations - it's all different now. Your site might have been great in 2019, but 2019 was a long time ago.

[CLOSE]
Let me do this: I'll record a 3-minute video walking through your site and pointing out the top 3 things costing you leads. Watch it when you have time. If what I show you makes sense, we talk. If not, you got free consulting. Deal?`,
  },
  {
    title: "5. Relationship Builder",
    content: `[INTRO]
Hey, Noah with 555 Digital. I know this is a cold call, so I appreciate you picking up. I'll keep it brief. I help local service businesses get more leads from their websites, and I'm reaching out because I think there might be an opportunity for us to work together down the line. Not selling anything today.

[THE PROBLEM]
Most business owners I talk to tell me the same thing: referrals are great, but they're unpredictable. One month you're slammed, next month you're slow. A good website fills those gaps by bringing in leads consistently - even when referrals dry up.

[VALUE PROP]
My approach is different from most web designers. I don't just build a site and disappear. I focus on results: how many leads are coming in, what's converting, what's not. I treat your website like a salesperson that works 24/7, and I track its performance just like you track your crew.

[OBJECTIONS]
"Now's not a good time" - Totally understand. That's actually why I'm calling now instead of when you're desperate. The best time to fix your online presence is when business is good, not when you're scrambling. What's a better time to circle back?

[CLOSE]
I'll do this: I'll send you a few examples of what I've done for other local businesses, including actual lead numbers. You look at them on your own time. If it sparks any questions, my number's in the email. If not, no hard feelings. What email should I use?`,
  },
];

function DashboardInner() {
  const scripts = useScripts();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loadingSamples, setLoadingSamples] = useState(false);

  // Auto-load sample scripts on first visit if no scripts exist
  const [samplesAutoLoaded, setSamplesAutoLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadySeeded = localStorage.getItem("script-coach-scripts-seeded");
    if (!alreadySeeded && scripts.length === 0 && !samplesAutoLoaded && !loadingSamples) {
      setSamplesAutoLoaded(true);
      localStorage.setItem("script-coach-scripts-seeded", "true");
      SAMPLE_SCRIPTS.forEach((s) => {
        const id = generateId();
        const now = new Date().toISOString();
        addScript({
          id,
          title: s.title,
          content: s.content,
          createdAt: now,
          updatedAt: now,
          versions: [{ id: generateId(), content: s.content, createdAt: now, label: "v1" }],
          analyses: [],
          outcomes: [],
          tags: ["sample"],
        });
      });
    }
  }, [scripts, samplesAutoLoaded, loadingSamples]);

  const totalOutcomes = scripts.reduce((sum, s) => sum + s.outcomes.length, 0);
  const wonCount = scripts.reduce(
    (sum, s) => sum + s.outcomes.filter((o) => o.result === "won").length,
    0
  );
  const winRate = totalOutcomes > 0 ? Math.round((wonCount / totalOutcomes) * 100) : 0;
  const analyzedCount = scripts.filter((s) => s.analyses.length > 0).length;

  const handleCreate = () => {
    if (loadingSamples) return; // Guard against rapid clicks
    const title = newTitle.trim() || "Untitled Script";
    const id = generateId();
    const now = new Date().toISOString();
    const script: Script = {
      id,
      title,
      content: "",
      createdAt: now,
      updatedAt: now,
      versions: [{ id: generateId(), content: "", createdAt: now, label: "v1" }],
      analyses: [],
      outcomes: [],
      tags: [],
    };
    addScript(script);
    router.push(`/script/${id}`);
  };

  const handleLoadSamples = () => {
    if (loadingSamples) return; // Guard against rapid clicks
    setLoadingSamples(true);
    SAMPLE_SCRIPTS.forEach((s) => {
      const id = generateId();
      const now = new Date().toISOString();
      addScript({
        id,
        title: s.title,
        content: s.content,
        createdAt: now,
        updatedAt: now,
        versions: [{ id: generateId(), content: s.content, createdAt: now, label: "v1" }],
        analyses: [],
        outcomes: [],
        tags: ["sample"],
      });
    });
    setLoadingSamples(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this script and all its versions?")) {
      deleteScript(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Script Coach</h1>
          <p className="text-text-secondary text-sm mt-1">
            AI-powered sales script analysis and coaching
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scripts.length === 0 && (
            <button
              onClick={handleLoadSamples}
              disabled={loadingSamples}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              {loadingSamples ? "Loading..." : "Load 5 Scripts"}
            </button>
          )}
          <button
            onClick={() => { setNewTitle(""); setShowNew(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Script
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar
        totalScripts={scripts.length}
        analyzedCount={analyzedCount}
        winRate={winRate}
        totalOutcomes={totalOutcomes}
      />

      {/* New script modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowNew(false)} aria-label="Close modal" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setShowNew(false)} />
          <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-lg font-semibold mb-4">New Sales Script</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Script name (e.g., Cold Call - Plumbers)"
              aria-label="Script name"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script list */}
      {scripts.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No scripts yet</h3>
          <p className="text-text-muted text-sm mb-6">
            Create your first sales script to get AI-powered coaching
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleLoadSamples}
              disabled={loadingSamples}
              className="inline-flex items-center gap-2 px-5 py-3 bg-surface border border-primary/20 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all"
            >
              <Download className="w-4 h-4" />
              Load 5 Sales Scripts
            </button>
            <span className="text-xs text-text-muted">or</span>
            <button
              onClick={() => { setNewTitle(""); setShowNew(true); }}
              className="text-sm text-text-secondary hover:text-primary transition-colors"
            >
              Create blank script
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onDelete={() => handleDelete(script.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-text-muted">Loading...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
