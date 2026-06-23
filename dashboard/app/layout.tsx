import type { Metadata } from 'next';
import './globals.css';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Inktoll — The AI-Powered Knowledge Economy',
  description: 'Creators get paid every time their work is read — and every time it is cited. Settle gasless nanopayments on Arc.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Glow ambient background elements */}
        <div className="bg-glow-container">
          <div className="bg-glow-1"></div>
          <div className="bg-glow-2"></div>
        </div>
        <div style={{ flex: '1 0 auto' }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
