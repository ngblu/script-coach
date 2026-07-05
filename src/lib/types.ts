export interface ScriptVersion {
  id: string;
  content: string;
  createdAt: string;
  label: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  overallScore: number;
  scores: {
    clarity: number;
    persuasion: number;
    objectionHandling: number;
    closingStrength: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  rewrittenSections: { original: string; improved: string; reason: string }[];
  summary: string;
}

export interface Outcome {
  id: string;
  versionId: string;
  result: "won" | "lost" | "no-response" | "meeting-booked";
  notes: string;
  date: string;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  versions: ScriptVersion[];
  analyses: AnalysisResult[];
  outcomes: Outcome[];
  tags: string[];
}
