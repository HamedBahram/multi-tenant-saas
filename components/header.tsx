import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import ClerkUserButton from '@/components/clerk-user-button'

import { LogIn } from 'lucide-react'
import { OrganizationSwitcher } from '@clerk/nextjs'

export default function Header() {
  return (
    <header className='bg-background/50 fixed top-0 right-0 left-0 z-50 py-6 backdrop-blur-sm'>
      <div className='container max-w-7xl'>
        <div className='flex items-center justify-between'>
          <OrganizationSwitcher />

          <SignedIn>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/pricing'>✨ Upgrade to Pro</Link>
            </Button>
          </SignedIn>

          <div className='flex items-center gap-4'>
            <ThemeToggle />
            <SignedOut>
              <SignInButton>
                <Button
                  size='sm'
                  variant='secondary'
                  className='hidden lg:inline-flex'
                >
                  Sign in
                </Button>
              </SignInButton>
              <SignInButton>
                <Button size='icon' variant='secondary' className='lg:hidden'>
                  <LogIn className='size-4' />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <ClerkUserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  )
}
