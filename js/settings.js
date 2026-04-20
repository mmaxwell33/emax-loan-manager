// ══════════════════════════════════════════════
// E-Max Loan Manager — Settings Module
// v2.1: the push-notification toggle is gone. Reminders are
// chased over WhatsApp via a one-tap deeplink on each loan card.
// Diagnostics still live here but are hidden by default and
// reached via a long-press on the sidebar brand icon.
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
    App.toast('Settings saved', 'success');
    const dash = document.getElementById('dash-biz-name');
    if (dash) dash.textContent = bizName;
  },

  async runDiagnostics() {
    const el = document.getElementById('diag-results');
    el.innerHTML = '<div class="text-muted">Running diagnostics…</div>';

    const checks = [];

    try {
      const { data } = await sb.from('agents').select('id').eq('id', App.agentId).single();
      checks.push({ label: 'Database Connection', pass: !!data, detail: data ? 'Connected' : 'Failed' });
    } catch (e) { checks.push({ label: 'Database Connection', pass: false, detail: e.message }); }

    const { data: { session } } = await sb.auth.getSession();
    checks.push({ label: 'Auth Session', pass: !!session, detail: session ? `Logged in as ${session.user.email}` : 'No session' });

    const { count: loanCount } = await sb.from('loans').select('*', { count: 'exact', head: true }).eq('agent_id', App.agentId);
    checks.push({ label: 'Loans Table', pass: loanCount !== null, detail: `${loanCount || 0} loans` });

    const { count: bCount } = await sb.from('borrowers').select('*', { count: 'exact', head: true }).eq('agent_id', App.agentId);
    checks.push({ label: 'Borrowers Table', pass: bCount !== null, detail: `${bCount || 0} borrowers` });

    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    checks.push({ label: 'Installed as App', pass: isPWA, detail: isPWA ? 'Running as installed app' : 'Running in browser — add to home screen for best experience' });

    checks.push({ label: 'Internet Connection', pass: navigator.onLine, detail: navigator.onLine ? 'Online' : 'Offline' });

    el.innerHTML = checks.map(c => `
      <div class="diag-row">
        <span class="diag-mark ${c.pass ? 'ok' : 'warn'}">${c.pass ? '✓' : '!'}</span>
        <div>
          <div class="diag-label">${c.label}</div>
          <div class="diag-detail">${c.detail}</div>
        </div>
      </div>`).join('');
  },
};
