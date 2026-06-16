/**
 * content-guard 模块测试
 */
import { describe, it, expect } from 'bun:test';
import {
  scanContent,
  verifyReference,
  validateClaimMap,
} from '../../src/safety/content-guard';
import type { ClaimEvidenceMap } from '../../src/types';

describe('content-guard', () => {
  describe('scanContent', () => {
    it('检测英文禁用词', () => {
      const result = scanContent('This is a crucial and robust finding.');
      expect(result.totalHits).toBeGreaterThanOrEqual(2);
      const words = result.forbiddenWords.map(w => w.word);
      expect(words).toContain('crucial');
      expect(words).toContain('robust');
    });

    it('检测中文禁用短语', () => {
      const result = scanContent('值得注意的是，本研究发现显著差异。');
      expect(result.totalHits).toBeGreaterThanOrEqual(1);
      expect(result.forbiddenWords[0].type).toBe('cn');
    });

    it('检测 AI 痕迹关键词', () => {
      const result = scanContent('We used GPT to generate the analysis code.');
      expect(result.totalHits).toBeGreaterThanOrEqual(1);
      expect(result.forbiddenWords.some(w => w.type === 'ai_trace')).toBe(true);
    });

    it('clean 内容无命中', () => {
      const result = scanContent('The patients were enrolled from January to December 2024.');
      expect(result.totalHits).toBe(0);
    });

    it('返回行号信息', () => {
      const text = 'line one\nthis is crucial\nline three';
      const result = scanContent(text);
      expect(result.forbiddenWords[0].line).toBe(2);
    });

    it('大小写不敏感检测', () => {
      const result = scanContent('DELVE is found in uppercase');
      expect(result.totalHits).toBeGreaterThanOrEqual(1);
      const result2 = scanContent('ClAuDe message');
      expect(result2.forbiddenWords.some(w => w.word === 'Claude')).toBe(true);
    });
  });

  describe('verifyReference', () => {
    it('验证 PMID', () => {
      const result = verifyReference('Some paper PMID: 12345678');
      expect(result.valid).toBe(true);
      expect(result.idType).toBe('PMID');
      expect(result.id).toBe('12345678');
    });

    it('验证 DOI', () => {
      const result = verifyReference('A study doi:10.1000/abc123-def456');
      expect(result.valid).toBe(true);
      expect(result.idType).toBe('DOI');
      expect(result.id).toContain('10.');
    });

    it('验证 CNKI ID', () => {
      const result = verifyReference('参考文章 CNKI:abcdef123456');
      expect(result.valid).toBe(true);
      expect(result.idType).toBe('CNKI');
    });

    it('验证 NCT ID', () => {
      const result = verifyReference('Clinical trial NCT01234567');
      expect(result.valid).toBe(true);
      expect(result.idType).toBe('NCT');
      expect(result.id).toBe('NCT01234567');
    });

    it('无效引用返回 valid: false', () => {
      const result = verifyReference('just some random text without a reference id');
      expect(result.valid).toBe(false);
    });

    it('空字符串返回 valid: false', () => {
      const result = verifyReference('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateClaimMap', () => {
    it('合法 claim 列表返回 valid: true', () => {
      const claims: ClaimEvidenceMap[] = [
        { claim_id: 'c1', claim_text: 'test', evidence_type: 'analysis_result', evidence_ids: ['e1'], verification_status: 'verified' },
        { claim_id: 'c2', claim_text: 'test2', evidence_type: 'literature', evidence_ids: ['e2', 'e3'], verification_status: 'verified' },
      ];
      const result = validateClaimMap(claims);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('缺失 claim_id 报错', () => {
      const claims: ClaimEvidenceMap[] = [
        { claim_id: 'c1', claim_text: 'good', evidence_type: 'analysis_result', evidence_ids: ['e1'], verification_status: 'verified' },
        { claim_id: '', claim_text: 'bad', evidence_type: 'analysis_result', evidence_ids: ['e2'], verification_status: 'verified' },
      ];
      const result = validateClaimMap(claims);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some(e => e.includes('claim_id'))).toBe(true);
    });

    it('缺失 evidence_type 报错', () => {
      const claims: ClaimEvidenceMap[] = [
        { claim_id: 'c1', claim_text: 'no type', evidence_type: '' as ClaimEvidenceMap['evidence_type'], evidence_ids: ['e1'], verification_status: 'verified' },
      ];
      const result = validateClaimMap(claims);
      expect(result.valid).toBe(false);
    });

    it('空 evidence_ids 报错', () => {
      const claims: ClaimEvidenceMap[] = [
        { claim_id: 'c1', claim_text: 'no evidence', evidence_type: 'analysis_result', evidence_ids: [], verification_status: 'verified' },
      ];
      const result = validateClaimMap(claims);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('no evidence_ids');
    });
  });
});
