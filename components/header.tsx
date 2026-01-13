import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { OrganizationSwitcher } from '@clerk/nextjs'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import ClerkUserButton from '@/components/clerk-user-button'

import { LogIn } from 'lucide-react'

export default async function Header() {
  const { has } = await auth()
  const hasPro = has?.({ plan: 'pro' }) ?? false

  return (
    <header className='bg-background/50 fixed top-0 right-0 left-0 py-6 backdrop-blur-sm'>
      <div className='container max-w-7xl'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Logo />
            <SignedIn>
              <OrganizationSwitcher />
            </SignedIn>
          </div>

          <div className='flex items-center gap-4'>
            {!hasPro && (
              <SignedIn>
                <Button asChild variant='ghost' size='sm'>
                  <Link href='/pricing'>✨ Upgrade to Pro</Link>
                </Button>
              </SignedIn>
            )}
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
