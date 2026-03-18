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

  const { lead, messages } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const systemPrompt = `You are an expert B2B sales outreach assistant for Axseter Systems, a national low-voltage integrator. You help craft cold emails, LinkedIn messages, follow-ups, and outreach strategy.

AXSETER CONTEXT:
- Single Point of Contact (SPoC) model: one partner replaces 15+ regional contractors for multi-location enterprises
- Services: structured cabling, access control, video surveillance, audio-visual, sound masking, break-fix support
- 500+ locations installed nationwide
- Key stats: $25,000+ annual overhead savings, 10-15% fewer change orders

AXSETER CLIENT LIST (use these as social proof in every outreach):
- Healthcare / Primary care: Oak Street Health, Guidelight Health
- Dental / DSO: (reference Oak Street Health and CVS as adjacent multi-location healthcare)
- Behavioral health: Soar Autism Center
- Physical therapy: ATI Physical Therapy
- Insurance: Pronto Insurance, Gallagher
- Pharmacy / Retail: CVS
- General multi-location: all of the above

CRITICAL RULE — CLIENT REFERENCES:
Every email and LinkedIn message MUST name-drop 1-2 relevant Axseter clients. Match clients to the lead's vertical:
- If the lead is dental, behavioral, PT, or healthcare → cite Oak Street Health, ATI Physical Therapy, Soar Autism Center, or CVS
- If the lead is insurance → cite Pronto Insurance and Gallagher
- If the lead is QSR/retail/vet → cite CVS and Oak Street Health as analogous multi-location operators
- Frame it naturally: "We handle infrastructure for [Client] across X locations" or "companies like [Client] and [Client] use us as their single national partner"
Never fabricate clients. Only reference the names listed above.

LEAD YOU'RE WORKING ON:
- Company: ${lead.name}
- Vertical: ${lead.vertLabel || lead.vertical}
- Locations: ${lead.locations} across ${lead.states} states
- Expansion signal: ${lead.signal}
- Ownership: ${lead.ownership}
- Estimated deal value: ${lead.value}
- Outreach template suggestion: ${lead.outreachTemplate}
${lead.contactName ? `- Contact: ${lead.contactName}, ${lead.contactTitle}` : '- Contact: name unknown, target VP of Real Estate / Facilities'}
${lead.contactEmail ? `- Email: ${lead.contactEmail}` : ''}
${lead.contactLinkedin ? `- LinkedIn: ${lead.contactLinkedin}` : ''}
${lead.play ? `- Recommended play: ${lead.play}` : ''}
${lead.notes ? `- Internal notes: ${lead.notes}` : ''}

RULES:
- When writing emails: subject line + body, direct tone, peer-to-peer, no buzzwords, reference the specific signal
- When writing LinkedIn messages: keep under 300 characters for connection requests, under 500 for InMails
- When writing follow-ups: reference the original outreach angle, add new value, don't just "bump"
- Always sign off emails with [Sender Name] / Axseter Systems / 1-877-AXSETR1
- Be concise in conversation. When asked to write something, just write it — don't over-explain
- If the user asks you to adjust, revise, or try a different angle, do it immediately`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages,
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
