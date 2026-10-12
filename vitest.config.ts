import { defineConfig } from 'vitest/config';

// Each workspace is a project so frontend tests get jsdom (frontend/vite.config.ts) while shared and backend stay on node.
export default defineConfig({ test: { projects: ['shared', 'backend', 'frontend'] } });
