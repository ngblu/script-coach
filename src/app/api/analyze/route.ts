import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { script, title } = await req.json();

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided" }, { status: 400 });
    }

    const apiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured. Add it in Settings or set OPENAI_API_KEY env var." },
        { status: 401 }
      );
    }

    const prompt = `You are an expert sales script coach. Analyze the following sales script and provide a detailed, actionable analysis.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):

{
  "overallScore": number from 1-100,
  "scores": {
    "clarity": number 1-100,
    "persuasion": number 1-100,
    "objectionHandling": number 1-100,
    "closingStrength": number 1-100
  },
  "strengths": ["3-5 specific strengths"],
  "weaknesses": ["3-5 specific weaknesses with actionable fixes"],
  "suggestions": ["5-7 specific, actionable improvement suggestions"],
  "rewrittenSections": [
    {
      "original": "exact text from the script that needs improvement",
      "improved": "rewritten version that is more effective",
      "reason": "why this rewrite is better"
    }
  ],
  "summary": "2-3 sentence overall assessment"
}

CRITICAL: rewrittenSections should contain 3-5 sections. Each "original" must be an EXACT quote from the provided script. Each "improved" should be a significantly better version. Be harsh and specific - no generic advice.

Script title: ${title || "Untitled"}

Script:
${script}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sales coach. Return only valid JSON, no markdown wrapping.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI API error:", response.status, err);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    // Clean markdown code fences if present
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const analysis = JSON.parse(jsonStr);

    // Add metadata
    analysis.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
    analysis.createdAt = new Date().toISOString();

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
