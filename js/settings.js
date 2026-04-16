// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Settings Module
// ══════════════════════════════════════════════

const Settings = {

  async load() {
    const { data: agent } = await sb.from('agents')
      .select('*').eq('id', App.agentId).single();
    if (agent) {
      document.getElementById('set-biz-name').value  = agent.business_name || '';
      document.getElementById('set-full-name').value = agent.full_name || '';
      document.getElementById('set-phone').value     = agent.phone || '';
    }
    // Check push subscription
    const hasSub = localStorage.getItem('push_subscribed') === 'true';
    const toggle = document.getElementById('notif-toggle');
    if (hasSub) toggle.classList.add('on');
  },

  async save() {
    const bizName  = document.getElementById('set-biz-name').value.trim();
    const fullName = document.getElementById('set-full-name').value.trim();
    const phone    = document.getElementById('set-phone').value.trim();

    const { error } = await sb.from('agents').update({
      business_name: bizName,
      full_name    : fullName,
      phone        : phone,
    }).eq('id', App.agentId);

    if (error) { App.toast('Error saving settings', 'error'); return; }
    App.toast('Settings saved ✅', 'success');
    document.getElementById('dash-biz-name').textContent = bizName;
  },

  async toggleNotifications(btn) {
    const isOn = btn.classList.toggle('on');
    if (!isOn) {
      localStorage.removeItem('push_subscribed');
      App.toast('Notifications turned off', 'info');
      return;
    }
    if (!('Notification' in window)) {
      App.toast('Notifications not supported on this browser', 'error');
      btn.classList.remove('on'); return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      App.toast('Permission denied — please allow notifications in your phone settings', 'error');
      btn.classList.remove('on'); return;
    }
    localStorage.setItem('push_subscribed', 'true');
    App.toast('🔔 Notifications enabled!', 'success');
    // Schedule a test notification
    setTimeout(() => {
      new Notification('E-Max Loans', {
        body: 'Notifications are working! You will be reminded about due payments.',
        icon: 'icons/icon-192.png'
      });
    }, 1000);
  },

  async runDiagnostics() {
    const el = document.getElementById('diag-results');
    el.innerHTML = '<div class="text-muted">Running diagnostics…</div>';

    const checks = [];

    // 1. Supabase connection
    try {
      const { data } = await sb.from('agents').select('id').eq('id', App.agentId).single();
      checks.push({ label: 'Database Connection', pass: !!data, detail: data ? 'Connected' : 'Failed' });
    } catch(e) { checks.push({ label: 'Database Connection', pass: false, detail: e.message }); }

    // 2. Auth session
    const { data: { session } } = await sb.auth.getSession();
    checks.push({ label: 'Auth Session', pass: !!session, detail: session ? `Logged in as ${session.user.email}` : 'No session' });

    // 3. Loans table
    const { count: loanCount } = await sb.from('loans').select('*', { count: 'exact', head: true }).eq('agent_id', App.agentId);
    checks.push({ label: 'Loans Table', pass: loanCount !== null, detail: `${loanCount || 0} loans` });

    // 4. Borrowers table
    const { count: bCount } = await sb.from('borrowers').select('*', { count: 'exact', head: true }).eq('agent_id', App.agentId);
    checks.push({ label: 'Borrowers Table', pass: bCount !== null, detail: `${bCount || 0} borrowers` });

    // 5. PWA install status
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    checks.push({ label: 'Installed as App', pass: isPWA, detail: isPWA ? 'Running as installed app ✅' : 'Running in browser (add to home screen for best experience)' });

    // 6. Online status
    checks.push({ label: 'Internet Connection', pass: navigator.onLine, detail: navigator.onLine ? 'Online' : 'Offline' });

    // Render
    el.innerHTML = checks.map(c => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px;flex-shrink:0">${c.pass ? '✅' : '⚠️'}</span>
        <div>
          <div style="font-size:13px;font-weight:600">${c.label}</div>
          <div class="text-muted" style="font-size:12px">${c.detail}</div>
        </div>
      </div>`).join('');
  },
};
