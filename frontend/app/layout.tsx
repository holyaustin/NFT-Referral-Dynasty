import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientProvider from '@/components/ClientProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Referral Dynasty - Evolve Your NFT Badge',
  description: 'Get dynamic NFT badges that evolve as your referral network grows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ClientProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}