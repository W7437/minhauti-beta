(function(){
  const cfg=window.MINHAUTI_AUTH||{};
  const configured=Boolean(
    cfg.supabaseUrl && cfg.supabaseAnonKey &&
    !String(cfg.supabaseUrl).includes('COLE_AQUI') &&
    !String(cfg.supabaseAnonKey).includes('COLE_AQUI')
  );

  window.MinhaUTIAuth={configured,client:null,user:null};

  function loginUrl(){return cfg.loginPath||'/login.html'}
  function currentReturn(){return location.pathname+location.search+location.hash}
  function redirectLogin(){
    if(location.pathname.endsWith('/login.html')) return;
    const target=loginUrl()+'?return='+encodeURIComponent(currentReturn());
    location.replace(target);
  }

  /* Mesmo sem Supabase configurado, a entrada passa pela tela de login.
     O login.html oferece explicitamente um modo de teste local; não há mais
     faixa sobre a interface principal. */
  if(!configured){
    const testSession=sessionStorage.getItem('minhauti_test_session')==='1';
    if(!testSession){
      document.documentElement.dataset.authState='checking';
      window.MinhaUTIAuth.ready=Promise.resolve(null);
      redirectLogin();
      return;
    }
    document.documentElement.dataset.authState='authenticated';
    window.MinhaUTIAuth.user={email:'modo-teste@local'};
    window.MinhaUTIAuth.ready=Promise.resolve({user:window.MinhaUTIAuth.user,testMode:true});
    window.MinhaUTIAuth.signOut=async()=>{
      sessionStorage.removeItem('minhauti_test_session');
      location.replace(loginUrl());
    };
    return;
  }

  document.documentElement.dataset.authState='checking';

  if(!window.supabase?.createClient){
    console.error('Supabase SDK não carregado.');
    redirectLogin();
    window.MinhaUTIAuth.ready=Promise.resolve(null);
    return;
  }

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  window.MinhaUTIAuth.client=client;

  window.MinhaUTIAuth.ready=(async()=>{
    try{
      const {data,error}=await client.auth.getSession();
      if(error){console.error(error);redirectLogin();return null;}
      const session=data?.session||null;
      window.MinhaUTIAuth.user=session?.user||null;
      if(!session){redirectLogin();return null;}
      document.documentElement.dataset.authState='authenticated';
      document.dispatchEvent(new CustomEvent('minhauti:auth-ready',{detail:{user:session.user}}));
      return session;
    }catch(err){
      console.error('Falha ao verificar autenticação:',err);
      redirectLogin();
      return null;
    }
  })();

  client.auth.onAuthStateChange((event,session)=>{
    window.MinhaUTIAuth.user=session?.user||null;
    if(session) document.documentElement.dataset.authState='authenticated';
    if(event==='SIGNED_OUT') redirectLogin();
  });

  window.MinhaUTIAuth.signOut=async()=>{
    await client.auth.signOut();
    location.replace(loginUrl());
  };
})();
