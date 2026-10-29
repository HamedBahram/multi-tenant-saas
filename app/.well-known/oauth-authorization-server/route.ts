import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from '@clerk/mcp-tools/next'

// Public: proxies Clerk's metadata for older MCP clients that look for it here
const handler = authServerMetadataHandlerClerk()

const corsHandler = metadataCorsOptionsRequestHandler()

export { handler as GET, corsHandler as OPTIONS }
