'use client'

import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard } from 'lucide-react'

export default function ClerkUserButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          href='/dashboard'
          label='Dashboard'
          labelIcon={<LayoutDashboard className='size-4' />}
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
