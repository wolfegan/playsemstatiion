// Crédito de autoria — aparece na tela de login e no rodapé da estante.
// Mantido como componente único pra editar o texto/links num lugar só.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Criado e desenvolvido por Victor Wolfegan</span>
      <span className="site-footer-links">
        <a href="https://instagram.com/victorwolfegan" target="_blank" rel="noopener noreferrer">
          Instagram @victorwolfegan
        </a>
        <span aria-hidden="true"> · </span>
        <a href="https://github.com/wolfegan" target="_blank" rel="noopener noreferrer">
          GitHub /wolfegan
        </a>
      </span>
    </footer>
  );
}
