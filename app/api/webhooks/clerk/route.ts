import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

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

  return new Response('', { status: 200 })
}
