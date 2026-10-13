import type { Metadata } from 'next';
import './globals.css';
import { FinanceProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'FinPro | Sistema de Controle Financeiro Integrado (Pessoal & Corporativo)',
  description: 'Sistema unificado de gestão financeira pessoal e multiempresa com separação estrita de contextos, DRE gerencial, conciliação bancária e integração Neon PostgreSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
        <FinanceProvider>
          {children}
        </FinanceProvider>
      </body>
    </html>
  );
}
