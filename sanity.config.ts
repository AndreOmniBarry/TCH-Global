import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schema';

// Powers the embedded Studio at /studio. Only reachable, and only
// functional, once NEXT_PUBLIC_SANITY_PROJECT_ID is set — see
// sanity/README.md. Sign-in is handled entirely by Sanity's own auth;
// this file has no access to anyone's credentials.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'kqruklk1';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool(), visionTool()],
});
