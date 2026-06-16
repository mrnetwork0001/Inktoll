import type { Metadata } from 'next';
import './globals.css';

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
      <body>
        {/* Glow ambient background elements */}
        <div className="bg-glow-container">
          <div className="bg-glow-1"></div>
          <div className="bg-glow-2"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
