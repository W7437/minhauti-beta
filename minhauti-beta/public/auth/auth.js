(function(){
  const cfg=window.MINHAUTI_AUTH||{};
  window.MinhaUTIAuth={configured:true,client:null,user:null};

  function loginUrl(){return cfg.loginPath||'/auth/login.html'}
  function currentReturn(){return location.pathname+location.search+location.hash}
  function redirectLogin(){
    if(location.pathname.endsWith('/login.html'))return;
    location.replace(loginUrl()+'?return='+encodeURIComponent(currentReturn()));
  }

  document.documentElement.dataset.authState='checking';

  if(!window.supabase?.createClient){
    console.error('Supabase SDK não carregado.');redirectLogin();return;
  }

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  window.MinhaUTIAuth.client=client;

  window.MinhaUTIAuth.ready=(async()=>{
    try{
      const {data,error}=await client.auth.getSession();
      if(error||!data?.session){redirectLogin();return null}
      const session=data.session;
      window.MinhaUTIAuth.user=session.user;
      document.documentElement.dataset.authState='authenticated';
      document.dispatchEvent(new CustomEvent('minhauti:auth-ready',{detail:{user:session.user}}));
      return session;
    }catch(err){console.error(err);redirectLogin();return null}
  })();

  client.auth.onAuthStateChange((event,session)=>{
    window.MinhaUTIAuth.user=session?.user||null;
    if(session)document.documentElement.dataset.authState='authenticated';
    if(event==='SIGNED_OUT')redirectLogin();
  });

  window.MinhaUTIAuth.signOut=async()=>{
    await client.auth.signOut();
    location.replace(loginUrl());
  };
})();
