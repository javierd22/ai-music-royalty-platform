import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Music Royalty Platform',
  description: 'AI-powered music royalty management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body style={{ margin: 0, padding: 0 }}>
        <main>{children}</main>
      </body>
    </html>
  );
}