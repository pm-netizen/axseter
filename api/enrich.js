export const config = { runtime: 'edge' };

// ─── EMAIL PATTERN GENERATION ────────────────────────────────────────────────
// Common B2B email patterns ordered by frequency
const PATTERNS = [
  (f, l) => `${f}.${l}`,           // john.doe
  (f, l) => `${f[0]}${l}`,         // jdoe
  (f, l) => `${f}${l}`,            // johndoe
  (f, l) => `${f}`,                // john
  (f, l) => `${l}.${f}`,           // doe.john
  (f, l) => `${f}${l[0]}`,         // johnd
  (f, l) => `${f[0]}.${l}`,        // j.doe
  (f, l) => `${f}_${l}`,           // john_doe
  (f, l) => `${f}-${l}`,           // john-doe
  (f, l) => `${l}${f[0]}`,         // doej
  (f, l) => `${f[0]}${l[0]}`,      // jd (unlikely but common at some firms)
  (f, l) => `${l}`,                // doe
];

function generatePatterns(firstName, lastName, domain) {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !l || !domain) return [];
  return PATTERNS.map(fn => `${fn(f, l)}@${domain}`);
}

function extractDomain(website) {
  if (!website) return null;
  try {
    let url = website.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

function splitName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// ─── HUNTER.IO INTEGRATION ──────────────────────────────────────────────────
async function hunterLookup(domain, firstName, lastName, apiKey) {
  if (!apiKey || !domain) return null;
  try {
    const params = new URLSearchParams({
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey,
    });
    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.data?.email) {
      return {
        email: data.data.email,
        confidence: data.data.confidence || 0,
        source: 'hunter.io',
        verified: data.data.verification?.status === 'valid',
        position: data.data.position || null,
        linkedin: data.data.linkedin || null,
      };
    }
    return null;
  } catch { return null; }
}

// Hunter domain search — find general email pattern for a company
async function hunterDomainSearch(domain, apiKey) {
  if (!apiKey || !domain) return null;
  try {
    const params = new URLSearchParams({ domain, api_key: apiKey });
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      pattern: data?.data?.pattern || null,
      organization: data?.data?.organization || null,
      emails: (data?.data?.emails || []).slice(0, 5).map(e => ({
        email: e.value,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        confidence: e.confidence,
      })),
    };
  } catch { return null; }
}

// ─── APOLLO.IO INTEGRATION ──────────────────────────────────────────────────
async function apolloLookup(domain, firstName, lastName, apiKey) {
  if (!apiKey || !domain) return null;
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_name: domain,
        reveal_personal_emails: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.person?.email) {
      return {
        email: data.person.email,
        confidence: data.person.email_confidence || 0,
        source: 'apollo.io',
        verified: data.person.email_status === 'verified',
        position: data.person.title || null,
        linkedin: data.person.linkedin_url || null,
      };
    }
    return null;
  } catch { return null; }
}

// ─── AI-POWERED LOOKUP ──────────────────────────────────────────────────────
async function aiEmailLookup(companyName, contactName, contactTitle, anthropicKey) {
  if (!anthropicKey || !companyName || !contactName) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Find the business email address for ${contactName}${contactTitle ? `, ${contactTitle}` : ''} at ${companyName}. 

Search LinkedIn, the company website, press releases, and industry directories. 

Return ONLY valid JSON, no other text:
{"email": "found@email.com or null", "confidence": 0-100, "source": "where you found it", "linkedin_url": "url or null", "company_domain": "domain.com", "email_pattern": "first.last or null"}`
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content || []).map(c => c.text || '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (parsed.email && parsed.email !== 'null') {
      return {
        email: parsed.email,
        confidence: parsed.confidence || 50,
        source: 'ai_search',
        sourceDetail: parsed.source || 'AI web search',
        verified: false,
        linkedin: parsed.linkedin_url || null,
        domain: parsed.company_domain || null,
        pattern: parsed.email_pattern || null,
      };
    }
    // Even if no email, return useful data
    return {
      email: null,
      domain: parsed.company_domain || null,
      pattern: parsed.email_pattern || null,
      linkedin: parsed.linkedin_url || null,
      source: 'ai_search',
    };
  } catch { return null; }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
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

  const json = (str) => new Response(JSON.stringify(str), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

  try {
    const body = await req.json();
    const { action, companyName, contactName, contactTitle, website, domain: inputDomain } = body;

    const hunterKey = process.env.HUNTER_API_KEY || null;
    const apolloKey = process.env.APOLLO_API_KEY || null;
    const anthropicKey = process.env.ANTHROPIC_API_KEY || null;
    const domain = inputDomain || extractDomain(website);
    const { firstName, lastName } = splitName(contactName);

    // ── Action: generate email patterns (no API keys needed) ──
    if (action === 'patterns') {
      const patterns = generatePatterns(firstName, lastName, domain);
      return json({ patterns, domain, firstName, lastName });
    }

    // ── Action: full enrichment pipeline ──
    if (action === 'enrich') {
      const results = [];
      const meta = { domain, firstName, lastName, services_tried: [] };

      // 1. Try Hunter.io email-finder
      if (hunterKey && domain && firstName && lastName) {
        meta.services_tried.push('hunter');
        const hunter = await hunterLookup(domain, firstName, lastName, hunterKey);
        if (hunter) results.push(hunter);
      }

      // 2. Try Apollo.io
      if (apolloKey && firstName && lastName) {
        meta.services_tried.push('apollo');
        const apollo = await apolloLookup(domain || companyName, firstName, lastName, apolloKey);
        if (apollo) results.push(apollo);
      }

      // 3. Generate domain patterns as fallback
      if (domain && firstName && lastName) {
        meta.services_tried.push('patterns');
        const patterns = generatePatterns(firstName, lastName, domain);
        results.push({
          email: patterns[0],  // Most common pattern
          allPatterns: patterns,
          confidence: 40,
          source: 'pattern_guess',
          verified: false,
        });
      }

      // 4. AI search if no high-confidence result yet
      const bestConfidence = Math.max(0, ...results.filter(r => r.email && r.source !== 'pattern_guess').map(r => r.confidence));
      if (bestConfidence < 70 && anthropicKey && companyName && contactName) {
        meta.services_tried.push('ai_search');
        const ai = await aiEmailLookup(companyName, contactName, contactTitle, anthropicKey);
        if (ai) {
          if (ai.email) results.push(ai);
          if (ai.domain) meta.aiDomain = ai.domain;
          if (ai.pattern) meta.aiPattern = ai.pattern;
          if (ai.linkedin) meta.aiLinkedin = ai.linkedin;

          // If AI found a domain but we didn't have one, generate patterns
          if (ai.domain && !domain && firstName && lastName) {
            const extraPatterns = generatePatterns(firstName, lastName, ai.domain);
            results.push({
              email: extraPatterns[0],
              allPatterns: extraPatterns,
              confidence: 35,
              source: 'pattern_guess_ai_domain',
              verified: false,
            });
          }
        }
      }

      // Sort by confidence
      results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

      // Pick best result
      const best = results.find(r => r.email && r.source !== 'pattern_guess' && r.source !== 'pattern_guess_ai_domain') || results[0] || null;

      return json({ best, all: results, meta });
    }

    // ── Action: hunter domain search ──
    if (action === 'domain_search') {
      if (!hunterKey) return json({ error: 'Hunter.io API key not configured', patterns: domain ? generatePatterns(firstName, lastName, domain) : [] });
      const result = await hunterDomainSearch(domain, hunterKey);
      return json({ ...result, domain });
    }

    // ── Action: check which services are configured ──
    if (action === 'status') {
      return json({
        hunter: !!hunterKey,
        apollo: !!apolloKey,
        anthropic: !!anthropicKey,
        patterns: true, // Always available
      });
    }

    return json({ error: 'Unknown action. Use: enrich, patterns, domain_search, status' });

  } catch (err) {
    return json({ error: err.message });
  }
}
