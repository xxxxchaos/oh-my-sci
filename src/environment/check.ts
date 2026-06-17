import type { OmoSciConfig } from '../types';
import { loadConfig } from '../config';
import type { CheckResult } from './reporter';
import { checkModelVersions, formatModelVersionResults } from './model-version-check';

export interface EnvCheckOptions { stage?: string; mcpOnly?: boolean; includeModelChecks?: boolean; }

export async function runAllChecks(config?: OmoSciConfig, options: EnvCheckOptions = {}): Promise<CheckResult[]> {
  const cfg = config ?? loadConfig();
  const results: CheckResult[] = [];

  // MCP
  for (const tool of cfg.environment.mcp_required) {
    results.push({ category: 'MCP', name: tool, status: 'unknown', message: '需 OpenCode host runtime 检查' });
  }
  for (const tool of cfg.environment.mcp_optional ?? []) {
    results.push({ category: 'MCP', name: tool, status: 'unknown', message: '可选，需 OpenCode host runtime 检查' });
  }

  // R (仅 stage 2+)
  if (!options.stage || options.stage === '2' || options.stage === 'all') {
    results.push({ category: 'R', name: 'R >= 4.3', status: 'warn', message: '阶段 2 数据分析需要。运行 `R --version` 验证。' });
    for (const pkg of cfg.environment.r_packages) {
      results.push({ category: 'R', name: `包: ${pkg}`, status: 'warn', message: `阶段 2 需要。运行 \`R -e 'library(${pkg})'\` 验证。` });
    }
  }

  // Software
  for (const sw of cfg.environment.software) {
    results.push({ category: 'Software', name: sw, status: 'warn', message: `运行 \`which ${sw.toLowerCase()}\` 验证。` });
  }
  results.push({ category: 'Software', name: 'OfficeCLI', status: 'warn', message: '安装: `npm i -g officecli`。' });

  // API
  for (const [cat, catConfig] of Object.entries(cfg.router.categories)) {
    if (catConfig.fallback_chain.length === 0) {
      results.push({ category: 'API', name: `分类: ${cat}`, status: 'fail', message: '无已配置模型。' });
    } else {
      results.push({ category: 'API', name: `分类: ${cat}`, status: 'pass', message: `${catConfig.fallback_chain.length} 模型。主: ${catConfig.fallback_chain[0]?.model_id}` });
    }
  }

  // 模型版本检查
  if (options.includeModelChecks) {
    const projectDir = process.cwd();
    const versionResults = checkModelVersions(projectDir);
    for (const vr of versionResults) {
      if (vr.status === 'ok') continue;
      results.push({
        category: '模型版本',
        name: vr.agent,
        status: vr.status === 'deprecated' ? 'fail' : 'warn',
        message: `${vr.currentModel} → ${vr.latestVersion}: ${vr.note}`,
      });
    }
  }

  return results;
}
