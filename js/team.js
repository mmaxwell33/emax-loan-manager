// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Team Module
// Invite management, account info
// ══════════════════════════════════════════════

const Team = {
  async load() {
    // Show current user's account info
    const { data: { user } } = await sb.auth.getUser();
    const { data: agent }    = await sb.from('agents')
      .select('*').eq('id', App.agentId).single();

    const el = document.getElementById('team-my-account');
    if (el && agent) {
      el.innerHTML = `
        <div class="detail-row mt12">
          <span class="dr-label">Name</span>
          <span class="dr-value">${agent.full_name || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Email</span>
          <span class="dr-value">${user?.email || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Business</span>
          <span class="dr-value">${agent.business_name || 'E-Max Enterprise'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Member Since</span>
          <span class="dr-value">${App.fmtDate(agent.created_at)}</span>
        </div>`;
    }

    // Show app URL
    const appUrlEl = document.getElementById('app-url-display');
    if (appUrlEl) appUrlEl.textContent = window.location.hostname;
  },

  copyInviteMessage() {
    const url = window.location.hostname;
    const msg = `Hi! I'd like to give you access to our E-Max Loan Manager system.

Steps to get started:
1. Open this link on your phone or computer: https://${url}
2. Click "No account? Create one"
3. Enter your email address and choose a password
4. Enter your full name when asked
5. You're in!

💡 Tip: On your phone, open the link in Safari (iPhone) or Chrome (Android), then tap "Add to Home Screen" to install it like an app.

Let me know once you're logged in!`;

    navigator.clipboard.writeText(msg)
      .then(() => App.toast('✅ Invite message copied! Paste into WhatsApp.', 'success', 4000))
      .catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = msg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        App.toast('✅ Invite message copied!', 'success');
      });
  },
};
