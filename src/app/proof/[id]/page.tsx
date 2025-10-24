export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Proof Certificate</h1>
      <p className='opacity-70 text-sm'>ID: {id}</p>
      <p className='text-sm'>
        In beta, fetch proof_certificates by ID and display verification_hash and onchain_tx.
      </p>
    </div>
  );
}
