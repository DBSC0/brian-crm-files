// Inicialización del cliente Supabase
// Reemplazar SUPABASE_URL y SUPABASE_ANON con los valores de tu proyecto
// Los encontrás en: Supabase Dashboard → Settings → API

(function() {
  var SUPABASE_URL  = 'https://wgfdmsvxxohwsuyjhmfg.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_Q6kPJVx5iX_6IFdvZg4WOA_NfUxcstQ';

  if (!window.supabase) {
    console.error('Supabase CDN no cargado. Verificar el orden de los <script> en el HTML.');
    return;
  }
  var _createClient = window.supabase.createClient;
  window.__supabase = _createClient(SUPABASE_URL, SUPABASE_ANON);
})();
