
import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Import Inter
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Use CSS variable
});

export const metadata: Metadata = {
  title: 'PantryWise',
  description: 'Smart recipe suggestions based on your pantry.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply Inter font via CSS variable */}
      <body className={`${inter.variable} font-sans antialiased`}>
        <> {/* Use a Fragment to avoid adding extra divs */}
          {children}
        </>
        <Toaster />
      </body>
    </html>
  );
}
