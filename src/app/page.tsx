export default function Home() {
  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '20px' }}>
        🎉 SUCCESS! 🎉
      </h1>
      <p style={{ fontSize: '24px', margin: '20px 0', color: '#2d5a2d' }}>
        Vercel deployment is working!
      </p>
      <p style={{ fontSize: '18px', color: '#666' }}>
        Time: {new Date().toLocaleString()}
      </p>
      <p style={{ fontSize: '16px', color: '#888' }}>
        Fresh deployment test
      </p>
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#e8f5e8', 
        borderRadius: '10px',
        border: '2px solid #4CAF50'
      }}>
        <p style={{ fontSize: '20px', color: '#2d5a2d', fontWeight: 'bold' }}>
          ✅ Deployment Successful!
        </p>
        <p style={{ fontSize: '16px', color: '#4a7c4a' }}>
          The 404 error has been resolved!
        </p>
      </div>
    </div>
  );
}