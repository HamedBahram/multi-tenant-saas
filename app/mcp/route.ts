import { verifyClerkToken } from '@clerk/mcp-tools/next'
import { auth } from '@clerk/nextjs/server'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { instructions, registerTools } from '@/lib/mcp/tools'

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: 'task-tracker', version: '1.0.0' },
  instructions,
})

const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    // OAuth tokens are Clerk machine tokens, verified against the user's grant
    const clerkAuth = await auth({ acceptsToken: 'oauth_token' })
    return verifyClerkToken(clerkAuth, token)
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
)

export { authHandler as GET, authHandler as POST }
