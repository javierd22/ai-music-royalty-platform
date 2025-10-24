export default function Home() {
  return (
    <div
      style={{
        padding: '50px',
        textAlign: 'center',
        backgroundColor: '#f0f0f0',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '48px', color: '#333' }}>🎉 WORKING! 🎉</h1>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>Vercel deployment is LIVE!</p>
      <p style={{ fontSize: '18px', color: '#666' }}>Time: {new Date().toLocaleString()}</p>
      <p style={{ fontSize: '16px', color: '#888' }}>Commit: 242a722</p>
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#e8f5e8',
          borderRadius: '10px',
        }}
      >
        <p style={{ fontSize: '20px', color: '#2d5a2d' }}>✅ Deployment Successful!</p>
        <p style={{ fontSize: '16px', color: '#4a7c4a' }}>The 404 error has been resolved!</p>
      </div>
    </div>
  );
}
