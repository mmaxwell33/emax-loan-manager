// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Dashboard Module
// ══════════════════════════════════════════════

const Dashboard = {

  async load() {
    // Greeting
    document.getElementById('dash-greeting').textContent = App.greeting();

    // Load agent name
    const { data: agent } = await sb.from('agents')
      .select('business_name, full_name').eq('id', App.agentId).single();
    if (agent?.business_name) {
      document.getElementById('dash-biz-name').textContent = agent.business_name;
    }

    // Load all active loans
    const { data: loans } = await sb.from('loans')
      .select('*, borrowers(full_name), payments(id, amount_paid)')
      .eq('agent_id', App.agentId);

    if (!loans) return;

    // Compute stats
    const today        = App.today();
    const activeLoans  = loans.filter(l => l.status === 'Active');
    const overdueLoans = loans.filter(l => l.status === 'Overdue' ||
                          (l.status === 'Active' && l.end_date < today));
    const outstanding  = activeLoans.reduce((s, l) => s + (l.total_repayable - l.amount_paid), 0);

    // Collected this month
    const thisMonth = today.slice(0, 7); // 'YYYY-MM'
    const { data: monthPayments } = await sb.from('payments')
      .select('amount_paid').eq('agent_id', App.agentId)
      .gte('payment_date', `${thisMonth}-01`);
    const collectedThisMonth = (monthPayments || []).reduce((s, p) => s + parseFloat(p.amount_paid), 0);

    // Update tiles
    document.getElementById('stat-active').textContent      = activeLoans.length;
    document.getElementById('stat-outstanding').textContent = Calculator.fmtShort(outstanding);
    document.getElementById('stat-collected').textContent   = Calculator.fmtShort(collectedThisMonth);
    document.getElementById('stat-overdue').textContent     = overdueLoans.length;

    // Due this week
    const upcoming = await Payments.getUpcoming(7);
    this._renderDueToday(upcoming);

    // Recent activity
    this._loadActivity();
  },

  _renderDueToday(upcoming) {
    const el = document.getElementById('due-today-list');
    if (!upcoming.length) {
      el.innerHTML = `<div class="text-muted" style="padding:8px 0">No payments due this week 🎉</div>`;
      return;
    }
    el.innerHTML = upcoming.map(l => {
      const dLabel = l.daysLeft < 0
        ? `<span class="text-red fw7">${Math.abs(l.daysLeft)}d overdue</span>`
        : l.daysLeft === 0
        ? `<span class="text-gold fw7">Due today</span>`
        : `<span>Due in ${l.daysLeft}d</span>`;
      return `
        <div class="loan-item" onclick="App.navigate('loan-detail','${l.id}')"
          style="padding:10px 0;cursor:pointer">
          <div class="loan-avatar" style="width:36px;height:36px;font-size:14px">
            ${(l.borrowers?.full_name||'?')[0].toUpperCase()}
          </div>
          <div class="loan-item-info">
            <div class="loan-item-name" style="font-size:14px">${l.borrowers?.full_name}</div>
            <div class="loan-item-sub">${dLabel} · Month ${l.monthsPaid + 1}/${l.duration_months}</div>
          </div>
          <div class="text-gold fw7" style="font-size:14px;flex-shrink:0">
            ${Calculator.fmt(l.monthly_payment)}
          </div>
        </div>`;
    }).join('');
  },

  async _loadActivity() {
    const { data: logs } = await sb.from('activity_log')
      .select('*').eq('agent_id', App.agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    const el = document.getElementById('activity-list');
    if (!logs?.length) {
      el.innerHTML = `<div class="text-muted">No activity yet</div>`;
      return;
    }
    const icons = {
      LOAN_CREATED: '💳', PAYMENT_RECORDED: '✅',
      LOAN_COMPLETED: '🎉', DEFAULT: '📝'
    };
    el.innerHTML = logs.map(log => {
      const ico  = icons[log.activity_type] || icons.DEFAULT;
      const time = new Date(log.created_at).toLocaleDateString('en-GH',
        { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
      return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:20px;flex-shrink:0">${ico}</span>
        <div>
          <div style="font-size:13px;font-weight:600">${log.description}</div>
          <div class="text-muted" style="font-size:11px">${time}</div>
        </div>
      </div>`;
    }).join('');
  },
};
