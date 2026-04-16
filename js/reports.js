// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Reports Module
// ══════════════════════════════════════════════

const Reports = {

  async load() {
    const [loansRes, borrowersRes, paymentsRes] = await Promise.all([
      sb.from('loans').select('*').eq('agent_id', App.agentId),
      sb.from('borrowers').select('id').eq('agent_id', App.agentId),
      sb.from('payments').select('*').eq('agent_id', App.agentId).order('payment_date'),
    ]);

    const loans     = loansRes.data     || [];
    const borrowers = borrowersRes.data || [];
    const payments  = paymentsRes.data  || [];

    // Summary stats
    const totalInterest    = loans.reduce((s, l) => s + parseFloat(l.total_interest), 0);
    const completedLoans   = loans.filter(l => l.status === 'Completed');
    const repaymentRate    = loans.length
      ? Math.round((completedLoans.length / loans.length) * 100) : 0;

    document.getElementById('rep-total-interest').textContent  = Calculator.fmtShort(totalInterest);
    document.getElementById('rep-total-loans').textContent     = loans.length;
    document.getElementById('rep-repayment-rate').textContent  = `${repaymentRate}%`;
    document.getElementById('rep-total-borrowers').textContent = borrowers.length;

    // Monthly breakdown
    this._renderMonthly(payments, loans);
  },

  _renderMonthly(payments, loans) {
    const el = document.getElementById('monthly-reports-list');
    if (!payments.length) {
      el.innerHTML = `<div class="text-muted text-center" style="padding:30px 0">No payment data yet</div>`;
      return;
    }

    // Group by YYYY-MM
    const byMonth = {};
    for (const p of payments) {
      const key = p.payment_date.slice(0, 7); // 'YYYY-MM'
      if (!byMonth[key]) byMonth[key] = { payments: [], total: 0, penalties: 0, lateCount: 0 };
      byMonth[key].payments.push(p);
      byMonth[key].total    += parseFloat(p.amount_paid);
      byMonth[key].penalties+= parseFloat(p.penalty_amount || 0);
      if (p.is_late) byMonth[key].lateCount++;
    }

    // Sort newest first
    const months = Object.keys(byMonth).sort().reverse();

    el.innerHTML = months.map(month => {
      const d    = new Date(month + '-01');
      const name = d.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
      const m    = byMonth[month];
      return `
        <div class="report-month-card">
          <div class="report-month-header">
            <span class="report-month-name">${name}</span>
            <span class="report-month-income">${Calculator.fmt(m.total)}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div style="text-align:center">
              <div style="font-size:18px;font-weight:800">${m.payments.length}</div>
              <div class="text-muted" style="font-size:11px">Payments</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--red)">${m.lateCount}</div>
              <div class="text-muted" style="font-size:11px">Late</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:18px;font-weight:800;color:var(--gold)">${Calculator.fmtShort(m.penalties)}</div>
              <div class="text-muted" style="font-size:11px">Penalties</div>
            </div>
          </div>
        </div>`;
    }).join('');
  },
};
