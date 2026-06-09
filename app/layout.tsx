import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import SupabaseSync from '@/components/providers/SupabaseSync';

export const metadata: Metadata = {
  title: 'Gambit Labs Business Simulator',
  description: 'Ferramenta avançada de cálculo, simulação e acompanhamento de decisões empresariais.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full">
      <body className="h-full bg-slate-50 antialiased">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-8">
              {children}
            </div>
          </main>
        </div>
        <SupabaseSync />
      </body>
    </html>
  );
}
