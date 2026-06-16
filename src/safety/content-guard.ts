/**
 * Content Guard — 内容安全扫描
 *
 * 禁用词检测、AI 痕迹扫描、文献引用验证。
 */
import type { ClaimEvidenceMap } from '../types';

// 英文禁用词
const EN_FORBIDDEN_WORDS = [
  'delve', 'crucial', 'groundbreaking', 'robust', 'comprehensive',
  'furthermore', 'moreover', 'notably', 'intriguingly', 'pivotal',
  'paradigm', 'testament', 'beacon', 'realm', 'landscape',
  'intricate', 'nuanced', 'multifaceted', 'holistic', 'underscores',
  'remarkable', 'remarkably',
];

// 中文禁用短语
const CN_FORBIDDEN_PHRASES = [
  '值得注意的是', '总的来说', '综上所述', '毋庸置疑',
  '显而易见', '不言而喻', '众所周知', '毫无疑问',
];

// AI 痕迹关键词 (Methods禁止)
const AI_TRACE_KEYWORDS = ['MCP', 'API', 'Claude', 'GPT', 'LLM', 'AI', '模型', '自动化工具', '技能', 'openai', 'anthropic'];

export interface ContentScanResult {
  forbiddenWords: Array<{ line: number; word: string; type: 'en' | 'cn' | 'ai_trace' }>;
  totalHits: number;
}

export function scanContent(text: string): ContentScanResult {
  const lines = text.split('\n');
  const forbiddenWords: ContentScanResult['forbiddenWords'] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i] ?? '';

    for (const word of EN_FORBIDDEN_WORDS) {
      if (line.toLowerCase().includes(word)) forbiddenWords.push({ line: lineNum, word, type: 'en' });
    }
    for (const phrase of CN_FORBIDDEN_PHRASES) {
      if (line.includes(phrase)) forbiddenWords.push({ line: lineNum, word: phrase, type: 'cn' });
    }
    for (const keyword of AI_TRACE_KEYWORDS) {
      if (line.toLowerCase().includes(keyword.toLowerCase())) forbiddenWords.push({ line: lineNum, word: keyword, type: 'ai_trace' });
    }
  }

  return { forbiddenWords, totalHits: forbiddenWords.length };
}

export function verifyReference(referenceText: string): { valid: boolean; idType?: string; id?: string } {
  // PMID: 8-digit number
  const pmidMatch = referenceText.match(/PMID:\s*(\d{8})/);
  if (pmidMatch) return { valid: true, idType: 'PMID', id: pmidMatch[1] };

  // DOI: 10.xxxx/xxxx
  const doiMatch = referenceText.match(/10\.\d{4,}\/[\w.-]+/);
  if (doiMatch) return { valid: true, idType: 'DOI', id: doiMatch[0] };

  // CNKI ID
  const cnkiMatch = referenceText.match(/CNKI[：:]\s*(\S+)/);
  if (cnkiMatch) return { valid: true, idType: 'CNKI', id: cnkiMatch[1] };

  // NCT ID
  const nctMatch = referenceText.match(/NCT\d{8}/);
  if (nctMatch) return { valid: true, idType: 'NCT', id: nctMatch[0] };

  return { valid: false };
}

export function validateClaimMap(claims: ClaimEvidenceMap[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const claim of claims) {
    if (!claim.claim_id) errors.push(`claim missing claim_id: "${claim.claim_text?.slice(0, 50)}"`);
    if (!claim.evidence_type) errors.push(`claim ${claim.claim_id}: missing evidence_type`);
    if (claim.evidence_ids.length === 0) errors.push(`claim ${claim.claim_id}: no evidence_ids`);
  }
  return { valid: errors.length === 0, errors };
}
