import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <section className='pt-32 pb-24 sm:pt-40'>
      <div className='container flex max-w-7xl items-center justify-center'>
        <SignUp />
      </div>
    </section>
  )
}
