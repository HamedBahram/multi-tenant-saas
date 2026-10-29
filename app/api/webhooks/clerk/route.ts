import { clerkClient } from '@clerk/nextjs/server'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

async function userExists(userId: string) {
  const clerk = await clerkClient()

  try {
    await clerk.users.getUser(userId)
    return true
  } catch (err) {
    if (isClerkAPIResponseError(err) && err.status === 404) return false
    throw err
  }
}

export async function POST(req: NextRequest) {
  let evt

  // Verify the payload signature (reads CLERK_WEBHOOK_SIGNING_SECRET)
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    // Deliveries can arrive late or out of order (e.g. retries), so don't
    // resurrect a user who has been deleted since the event was sent
    if (!(await userExists(id))) {
      console.log(`User ${id} no longer exists, skipping ${eventType}`)
      return new Response('', { status: 200 })
    }

    const primaryEmail = email_addresses?.find(
      email => email.id === evt.data.primary_email_address_id
    )?.email_address

    await db.user.upsert({
      where: { id },
      update: {
        email: primaryEmail,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
      create: {
        id,
        email: primaryEmail,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
    })

    console.log(
      `User ${id} ${eventType === 'user.created' ? 'created' : 'updated'}`
    )
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (id) {
      // Tasks will have assigneeId set to null due to onDelete: SetNull
      await db.user
        .delete({
          where: { id },
        })
        .catch(() => {
          // User might not exist in our DB yet
          console.log(`User ${id} not found in database, skipping delete`)
        })

      console.log(`User ${id} deleted`)
    }
  }

  if (eventType === 'organizationMembership.deleted') {
    // Clerk keeps an org after its last member is gone (e.g. the user was
    // deleted), so delete it ourselves, which fires organization.deleted
    const organizationId = evt.data.organization.id
    const clerk = await clerkClient()

    try {
      const org = await clerk.organizations.getOrganization({
        organizationId,
        includeMembersCount: true,
      })

      if (org.membersCount === 0) {
        await clerk.organizations.deleteOrganization(organizationId)
        console.log(`Organization ${organizationId} has no members, deleted`)
      }
    } catch (err) {
      // The org itself was deleted, which also removes its memberships
      if (isClerkAPIResponseError(err) && err.status === 404) {
        console.log(`Organization ${organizationId} not found, skipping`)
      } else {
        throw err
      }
    }
  }

  if (eventType === 'organization.deleted') {
    const { id } = evt.data

    if (id) {
      // Projects and tasks belong to the org, so they go with it
      await db.$transaction([
        db.task.deleteMany({ where: { orgId: id } }),
        db.project.deleteMany({ where: { orgId: id } }),
      ])

      console.log(`Organization ${id} projects and tasks deleted`)
    }
  }

  return new Response('', { status: 200 })
}
