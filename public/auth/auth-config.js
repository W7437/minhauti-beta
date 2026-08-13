/* MinhaUTI — configuração pública do Supabase.
   A anon/publishable key pode ficar no navegador. NUNCA coloque service_role aqui. */
window.MINHAUTI_AUTH = {
  supabaseUrl: "COLE_AQUI_A_URL_DO_PROJETO_SUPABASE",
  supabaseAnonKey: "COLE_AQUI_A_CHAVE_ANON_OU_PUBLISHABLE",
  loginPath: "/auth/login.html",
  homePath: "/app/",
  resetPath: "/auth/redefinir-senha.html"
};
