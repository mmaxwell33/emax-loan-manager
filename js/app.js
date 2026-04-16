// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — App Shell
// Routing, Toasts, Navigation, Supabase init
// ══════════════════════════════════════════════

// Supabase client (global)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// App state
const App = {
  currentScreen : 'auth',
  prevScreen    : null,
  agentId       : null,   // set after login
  navScreens    : ['dashboard','loans','borrowers','reports'],

  // ─── Navigation ─────────────────────────────
  navigate(screenId, data = null) {
    const prev = document.getElementById(`screen-${this.currentScreen}`);
    const next = document.getElementById(`screen-${screenId}`);
    if (!next) return;

    if (prev) prev.classList.remove('active');
    next.classList.add('active');
    next.scrollTop = 0;

    this.prevScreen    = this.currentScreen;
    this.currentScreen = screenId;

    // Update bottom nav highlight
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(`nav-${screenId}`);
    if (navBtn) navBtn.classList.add('active');

    // Lazy-load screen data
    if (screenId === 'dashboard')  Dashboard.load();
    if (screenId === 'loans')      Loans.loadList();
    if (screenId === 'borrowers')  Borrowers.loadList();
    if (screenId === 'reports')    Reports.load();
    if (screenId === 'loan-detail' && data)       Loans.loadDetail(data);
    if (screenId === 'borrower-detail' && data)   Borrowers.loadDetail(data);
    if (screenId === 'settings')   Settings.load();
  },

  back() {
    this.navigate(this.prevScreen || 'dashboard');
  },

  // ─── Toast notifications ─────────────────────
  toast(msg, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  // ─── Auth state listener ──────────────────────
  async init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await this.onLoggedIn(session.user);
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.onLoggedIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.onLoggedOut();
      }
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // Set today's date as default for loan start
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('l-start');
    if (startInput) startInput.value = today;
  },

  async onLoggedIn(user) {
    // Ensure agent profile exists
    let { data: agent } = await sb.from('agents')
      .select('id').eq('user_id', user.id).single();

    if (!agent) {
      const { data: newAgent } = await sb.from('agents')
        .insert({ user_id: user.id, full_name: user.user_metadata?.full_name || '' })
        .select('id').single();
      agent = newAgent;
    }
    this.agentId = agent?.id;

    document.getElementById('bottom-nav').classList.add('visible');
    this.navigate('dashboard');
  },

  onLoggedOut() {
    this.agentId = null;
    document.getElementById('bottom-nav').classList.remove('visible');
    this.navigate('auth');
  },

  // ─── Date helpers ─────────────────────────────
  today() {
    return new Date().toISOString().split('T')[0];
  },

  fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' });
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning 👋';
    if (h < 17) return 'Good afternoon 👋';
    return 'Good evening 👋';
  },
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
