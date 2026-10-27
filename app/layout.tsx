import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mneme — a little space for your future self',
  description: 'Write a letter. Plant a thought. Watch it grow. A private-feeling, local voxel garden saved in your browser.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
