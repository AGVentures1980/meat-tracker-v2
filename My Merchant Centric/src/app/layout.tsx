import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BRASA Brand Pulse™',
  description: 'Social Reputation & Review Intelligence OS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
