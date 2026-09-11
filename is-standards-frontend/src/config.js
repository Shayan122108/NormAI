export const OPEN_NOTEBOOK_API = 'http://localhost:5055';
export const NOTEBOOK_ID = 'notebook:q9gsb3nvnw9bvghshg58';

export const EXAMPLES = [
  'PVC insulated cables for 1100V internal building wiring',
  'Safety helmets for construction site workers',
  'Earthing system installation for server room',
  'uPVC pipes for drinking water supply distribution',
  'Desktop computers and printers for office IT upgrade',
  'Hot rolled structural steel plates for workshop shed fabrication',
  'TMT reinforcement bars Fe 500D for RCC column and beam work',
  'Insulating rubber gloves for high-voltage line maintenance',
];

export const SYSTEM_PROMPT = `You are an expert on Indian Standards (IS/BIS codes) for government procurement in India.

When given a procurement specification, you MUST:
1. Identify ALL applicable IS codes from your knowledge base
2. For each IS code state: the standard code, title, scope, and exactly why it applies
3. Clearly state whether BIS certification is MANDATORY or not for each standard
4. Rank standards by relevance (most directly applicable first)
5. If no standard applies, say so clearly

Format your response with clear headings for each standard. Be concise and accurate.`;
