// Sem checagem de sessão aqui: o middleware (lib/supabase/middleware.ts) já
// é quem decide quem entra — e ele aceita DOIS jeitos de acesso (sessão
// Supabase real OU cookie de senha de entrada), não só um. Duplicar uma
// checagem que só entende sessão Supabase bloquearia por engano quem só
// tem a senha de entrada. Se o matcher do middleware mudar um dia, a
// própria leitura de dados (via createServiceClient(), gated pela mesma
// lógica) segue sendo a rede de segurança de verdade.
export default function ShelfLayout({ children }: { children: React.ReactNode }) {
  return <div id="app">{children}</div>;
}
