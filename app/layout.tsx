import '../globals.css';
import './globals.css';

export const metadata = {
  title: 'AI Music Royalty Platform',
  description: 'Provenance-first attribution and royalty system for AI-generated music',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className='antialiased'>{children}</body>
    </html>
  );
}
