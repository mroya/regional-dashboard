import './globals.css';

export const metadata = {
  title: 'Dashboard Regional - Área 02',
  description: 'Painel do Coordenador',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
