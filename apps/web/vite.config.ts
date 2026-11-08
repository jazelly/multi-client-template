import AgenticReact from '@agentic-react/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // AgenticReact adds the dev-only toolbox and MCP endpoint (/mcp) so coding agents can see and pick UI elements.
  plugins: [react(), tailwindcss(), AgenticReact()],
  // The server (apps/server) runs on 3100; the dev app reaches it from its own origin so the session cookie works.
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3100' } },
});
