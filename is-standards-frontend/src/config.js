import { PROCUREMENT_EXAMPLES_BY_CATEGORY } from './standardsData.js';

export const RAG_BACKEND_API = 'http://localhost:5055';
// Custom RAG Pipeline Knowledge Base Collection ID
export const KNOWLEDGE_BASE_ID = 'notebook:q9gsb3nvnw9bvghshg58';

// Flattened list for quick chips
export const EXAMPLES = [
  'Supply of TMT reinforcement bars Fe 500D grade for RCC column and beam work',
  'Procurement of 43 Grade Ordinary Portland Cement for RCC construction work',
  'PVC insulated cables for 1100V internal building wiring',
  'Safety helmets and protective footwear for construction site workers',
  'Installation of pipe and plate earthing system for server room',
  'uPVC pipes for drinking water supply distribution',
  'Desktop computers, LED monitors, and laser printers for office IT upgrade',
  'Hot rolled structural steel plates for workshop shed fabrication',
  'Insulating rubber gloves for high-voltage line maintenance'
];

export { PROCUREMENT_EXAMPLES_BY_CATEGORY };

export const SYSTEM_PROMPT = `You are an expert on Indian Standards (IS/BIS codes) for government procurement in India.

When given a procurement specification, you MUST:
1. Identify ALL applicable IS codes from your knowledge base
2. For each IS code state: the standard code, title, scope, and exactly why it applies
3. Clearly state whether BIS certification is MANDATORY or not for each standard
4. Rank standards by relevance (most directly applicable first)
5. If no standard applies, say so clearly

Format your response with clear headings for each standard. Be concise and accurate.`;
