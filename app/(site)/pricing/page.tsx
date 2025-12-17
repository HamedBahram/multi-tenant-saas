import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
  return (
    <section className='py-32'>
      <div className='container max-w-4xl'>
        <div className='mb-12 text-center'>
          <h1 className='mb-4 text-4xl font-bold'>Choose Your Plan</h1>
          <p className='text-muted-foreground text-lg'>
            Unlock unlimited projects and advanced features with Pro
          </p>
        </div>
        <PricingTable for='organization' />
      </div>
    </section>
  )
}
