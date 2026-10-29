import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from '@clerk/mcp-tools/next'

// Public: MCP clients read this to discover Clerk as the authorization server
const handler = protectedResourceHandlerClerk({
  scopes_supported: ['profile', 'email'],
})

const corsHandler = metadataCorsOptionsRequestHandler()

export { handler as GET, corsHandler as OPTIONS }
