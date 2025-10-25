import '../globals.css';
import './globals.css';

import { ToastProvider } from './components/ToastProvider';

export const metadata = {
  title: 'AI Music Royalty Platform',
  description: 'Provenance-first attribution and royalty system for AI-generated music',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className='antialiased'>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
