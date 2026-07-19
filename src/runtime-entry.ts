/**
 * Bundled entrypoint copied into a project's `.opencode/plugins/` directory.
 * Keep a single named export so OpenCode initializes the plugin exactly once.
 */
import { OmoSciPlugin } from './index';

export const OmoSciRuntimePlugin = OmoSciPlugin;
