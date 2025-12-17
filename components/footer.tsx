import Link from 'next/link'
import { Button } from './ui/button'

export default function Footer() {
  return (
    <footer className='py-4'>
      <div className='text-muted-foreground container flex max-w-7xl flex-col items-center justify-between gap-x-3 gap-y-1 text-center text-sm sm:flex-row'>
        <p>&copy;{new Date().getFullYear()} NextJs 16</p>
        <p>
          Template by{' '}
          <Button variant='link' className='p-0' asChild>
            <Link
              target='_blank'
              rel='noopener noreferrer'
              href='https://www.hamedbahram.io/'
            >
              Hamed Bahram
            </Link>
          </Button>
        </p>
      </div>
    </footer>
  )
}
