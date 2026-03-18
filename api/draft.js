export const config = { runtime: 'edge' };

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

  const { lead } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const prompt = `You are an expert B2B sales copywriter for Axseter Systems, a national low-voltage integrator.

COMPANY CONTEXT:
- Axseter is the Single Point of Contact (SPoC) model: one partner replaces 15+ regional contractors for multi-location enterprises
- Services: structured cabling, access control, video surveillance, audio-visual, sound masking, break-fix support
- 500+ locations installed nationwide
- Key stat: $25,000+ annual overhead savings, 10-15% fewer change orders

AXSETER CLIENT LIST — USE THESE AS SOCIAL PROOF:
- Healthcare / Primary care: Oak Street Health, Guidelight Health
- Behavioral health: Soar Autism Center
- Physical therapy: ATI Physical Therapy
- Insurance: Pronto Insurance, Gallagher
- Pharmacy / Retail: CVS

CLIENT MATCHING RULES:
- Dental, behavioral, PT, or healthcare leads → cite Oak Street Health, ATI Physical Therapy, Soar Autism Center, or CVS
- Insurance leads → cite Pronto Insurance and Gallagher
- QSR/retail/vet leads → cite CVS and Oak Street Health as analogous multi-location operators
- EVERY email MUST name-drop 1-2 clients matched to the lead's vertical
- Frame naturally: "We handle infrastructure for [Client] across X locations" or "companies like [Client] and [Client]"
- Never fabricate clients. Only use names listed above.

LEAD:
- Company: ${lead.name}
- Vertical: ${lead.vertLabel}
- Locations: ${lead.locations} across ${lead.states} states
- Expansion signal: ${lead.signal}
- Ownership: ${lead.ownership}
- Estimated deal: ${lead.value}
${lead.contactName ? `- Contact: ${lead.contactName}, ${lead.contactTitle}` : '- Contact: VP of Real Estate / Facilities (name unknown)'}
${lead.play ? `- Recommended play: ${lead.play}` : ''}

Write a cold outreach email. Rules:
1. Subject line: specific, no fluff, references the actual trigger
2. Opener: reference the specific expansion signal — don't be generic
3. Pain: articulate the vendor fragmentation problem they're about to face (or already face)
4. Value: Axseter's SPoC model, cite a relevant named client, use the $25K+ stat
5. CTA: one ask — 20-minute call
6. Tone: direct, peer-to-peer, zero filler, no buzzwords
7. Length: 150-200 words for the body
8. Sign off with placeholder [Sender Name] and Axseter Systems / 1-877-AXSETR1

Respond ONLY with JSON: {"subject":"...","body":"..."}`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await anthropicRes.json();

  return new Response(JSON.stringify(data), {
    status: anthropicRes.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
