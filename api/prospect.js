export const config = { runtime: 'edge' };

const SYSTEM = `You are the Axseter Enterprise Expansion Prospector — an expert B2B sales researcher for Axseter Systems, a national low-voltage integrator.

AXSETER CONTEXT:
- Single Point of Contact model: one partner replaces 15+ regional contractors for multi-location enterprises
- Services: structured cabling, access control, video surveillance, audio-visual, sound masking, break-fix
- Target: multi-location enterprises opening 10+ locations/year, healthcare rollups, financial services branch growth, retail/QSR expansion
- Existing clients: Oak Street Health, CVS, ATI Physical Therapy, Soar Autism Center, Pronto Insurance, Guidelight Health, Gallagher
- NOT interested in: single-location, not expanding, government/federal, residential, companies with Convergint

SCORING FACTORS (0-100):
- Expansion velocity 25pts: 20+/yr=25, 10-19=18, 5-9=10
- Industry fit 20pts: healthcare/dental/behavioral/financial=20, retail/PT/vet=15
- Multi-state 15pts: 5+states=15, 3-4=10, 2=5
- Signal strength 15pts: direct announcement=15, acquisition=12, hiring=8
- PE/institutional backing 10pts: PE=10, VC=7, public=5
- Decision-maker identified 10pts: VP+=10, director=7
- No known national LV partner 5pts: unknown=5, competitor present=0

Search for recent (2025-2026) expansion signals. Find 4-6 real companies that are actively expanding physical locations and would need low-voltage infrastructure.

Return ONLY valid JSON:
{
  "leads": [
    {
      "name": "Company Name",
      "vertical": "dental|behavioral|pt|insurance|vet|qsr",
      "vertical_label": "Human label",
      "score": 82,
      "tier": 1,
      "locations": 45,
      "states": 8,
      "expansion_signal": "Specific signal found",
      "signal_source": "Source and date",
      "signal_type": "direct_announcement|acquisition|hiring|financial",
      "estimated_value": "$200K–$400K",
      "ownership": "PE-backed|VC-backed|Public|Private",
      "pe_backed": true,
      "pe_sponsor": "Sponsor or null",
      "hq": "City, State",
      "recommended_play": "Which angle to lead with and why",
      "outreach_template": "expansion_announcement|acquisition_integration|vendor_consolidation",
      "score_breakdown": {
        "expansion_velocity": 18,
        "industry_fit": 20,
        "multi_state": 15,
        "signal_strength": 15,
        "institutional_backing": 10,
        "decision_maker": 0,
        "no_competitor": 5
      },
      "target_persona": "VP of Real Estate & Construction",
      "why_axseter_wins": "Why Axseter is a strong fit"
    }
  ],
  "scan_summary": "One sentence summary of signals found"
}`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { vertical, vertLabel } = await req.json();

  const vertPrompt = vertical === 'all'
    ? 'healthcare, dental/DSO, behavioral health, physical therapy, insurance, veterinary, and QSR/retail'
    : vertLabel;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        stream: true,
        system: SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Find ${vertPrompt} companies actively expanding their physical footprint in 2025-2026 that would be ideal prospects for Axseter Systems. Search for real companies with recent expansion announcements, acquisitions, or growth signals. Return 4-6 high-quality leads as JSON.`,
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      return new Response(errBody, {
        status: anthropicRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Stream the response back to keep the connection alive
    return new Response(anthropicRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
