// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Analytics Module
// Full Chart.js integration, KPIs, trends
// ══════════════════════════════════════════════

const Analytics = {
  _charts : {},   // cache chart instances

  async load() {
    const months = parseInt(document.getElementById('analytics-period')?.value || 6);
    const loans  = await this._fetchLoans();
    const pays   = await this._fetchPayments(months);

    this._renderKPIs(loans, pays);
    this._renderCollectionsChart(pays, months);
    this._renderVolumeChart(loans, months);
    this._renderStatusDonut(loans);
    this._renderComparisonChart(loans, months);
    this._renderTopBorrowers(loans);
  },

  async _fetchLoans() {
    const { data } = await sb.from('loans')
      .select('*, borrowers(full_name), payments(amount_paid, payment_date, is_late, penalty_amount)')
      .eq('agent_id', App.agentId);
    return data || [];
  },

  async _fetchPayments(months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const { data } = await sb.from('payments')
      .select('amount_paid, penalty_amount, payment_date, is_late')
      .eq('agent_id', App.agentId)
      .gte('payment_date', cutoff.toISOString().split('T')[0]);
    return data || [];
  },

  _renderKPIs(loans, pays) {
    const totalInterest = loans.reduce((s, l) => {
      // interest earned = amount paid minus principal portion
      const paid = parseFloat(l.amount_paid) || 0;
      const interestFrac = (l.total_interest / l.total_repayable) || 0;
      return s + (paid * interestFrac);
    }, 0);

    const repaid = loans.filter(l => l.status === 'Completed').length;
    const rate   = loans.length ? Math.round(repaid / loans.length * 100) : 0;

    const borrowerIds = new Set(loans.map(l => l.borrower_id));

    this._setKPI('an-interest',     Calculator.fmtShort(totalInterest));
    this._setKPI('an-total-loans',  loans.length);
    this._setKPI('an-repayment',    `${rate}%`);
    this._setKPI('an-borrowers',    borrowerIds.size);
  },

  _setKPI(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  // Monthly Collections bar chart
  _renderCollectionsChart(pays, months) {
    const labels  = [];
    const values  = [];
    const now     = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(d.toLocaleDateString('en-GH', { month: 'short', year: '2-digit' }));
      const total = pays
        .filter(p => p.payment_date?.startsWith(key))
        .reduce((s, p) => s + parseFloat(p.amount_paid), 0);
      values.push(total);
    }

    this._makeChart('chart-interest', 'bar', labels, [{
      label: 'Interest Earned (GH₵)',
      data: values.map(v => {
        // approximate interest as 10/11 of collected (10% of principal+interest)
        return Math.round(v * 0.0909 * 10) / 10;
      }),
      backgroundColor: 'rgba(91,91,214,0.7)',
      borderColor: '#5b5bd6',
      borderWidth: 2,
      borderRadius: 6,
    }]);
  },

  // Loans issued per month
  _renderVolumeChart(loans, months) {
    const labels = [];
    const values = [];
    const now    = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(d.toLocaleDateString('en-GH', { month: 'short', year: '2-digit' }));
      values.push(loans.filter(l => l.start_date?.startsWith(key)).length);
    }

    this._makeChart('chart-volume', 'line', labels, [{
      label: 'Loans Issued',
      data: values,
      backgroundColor: 'rgba(34,197,94,0.15)',
      borderColor: '#22c55e',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#22c55e',
      pointRadius: 4,
    }]);
  },

  // Status doughnut
  _renderStatusDonut(loans) {
    const counts = { Active: 0, Overdue: 0, Completed: 0, Defaulted: 0 };
    const today  = App.today();
    loans.forEach(l => {
      let s = l.status;
      if (s === 'Active' && l.end_date < today) s = 'Overdue';
      counts[s] = (counts[s] || 0) + 1;
    });

    const labels = Object.keys(counts).filter(k => counts[k] > 0);
    const data   = labels.map(k => counts[k]);
    const colors = { Active: '#5b5bd6', Overdue: '#ef4444', Completed: '#22c55e', Defaulted: '#6b7280' };

    this._makeChart('chart-donut-an', 'doughnut', labels, [{
      data,
      backgroundColor: labels.map(l => colors[l]),
      borderWidth: 0,
      hoverOffset: 8,
    }], { cutout: '65%' });

    // Legend
    const el = document.getElementById('an-status-legend');
    if (el) el.innerHTML = labels.map((l, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        <span style="width:12px;height:12px;border-radius:50%;background:${colors[l]};flex-shrink:0"></span>
        <span style="font-size:13px">${l}</span>
        <span style="font-size:13px;font-weight:700;margin-left:auto">${data[i]}</span>
      </div>`).join('');
  },

  // Outstanding vs Collected comparison
  _renderComparisonChart(loans, months) {
    const labels      = [];
    const outstanding = [];
    const collected   = [];
    const now         = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(d.toLocaleDateString('en-GH', { month: 'short', year: '2-digit' }));

      // loans active in this month
      const activeInMonth = loans.filter(l => {
        return l.start_date <= key + '-31' && l.end_date >= key + '-01';
      });
      const owed = activeInMonth.reduce((s, l) => {
        return s + (parseFloat(l.total_repayable) - parseFloat(l.amount_paid));
      }, 0);
      const paid = activeInMonth.reduce((s, l) => s + parseFloat(l.amount_paid), 0);

      outstanding.push(Math.round(owed));
      collected.push(Math.round(paid));
    }

    this._makeChart('chart-comparison', 'bar', labels, [
      {
        label: 'Outstanding (GH₵)',
        data: outstanding,
        backgroundColor: 'rgba(239,68,68,0.6)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Collected (GH₵)',
        data: collected,
        backgroundColor: 'rgba(34,197,94,0.6)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 4,
      },
    ], {}, true);
  },

  // Top borrowers
  _renderTopBorrowers(loans) {
    const el = document.getElementById('top-borrowers-table');
    if (!el) return;

    const byBorrower = {};
    loans.forEach(l => {
      const n = l.borrowers?.full_name || 'Unknown';
      if (!byBorrower[n]) byBorrower[n] = { name: n, total: 0, count: 0, paid: 0 };
      byBorrower[n].total += parseFloat(l.principal);
      byBorrower[n].paid  += parseFloat(l.amount_paid);
      byBorrower[n].count++;
    });

    const sorted = Object.values(byBorrower).sort((a, b) => b.total - a.total).slice(0, 10);

    if (!sorted.length) {
      el.innerHTML = `<div class="text-muted">No data yet</div>`;
      return;
    }

    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border);font-size:12px;color:var(--text2)">
            <th style="padding:8px 0;text-align:left">#</th>
            <th style="padding:8px 0;text-align:left">Borrower</th>
            <th style="padding:8px 0;text-align:right">Loans</th>
            <th style="padding:8px 0;text-align:right">Total Borrowed</th>
            <th style="padding:8px 0;text-align:right">Repaid</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((b, i) => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 0;color:var(--text2);font-size:13px">${i+1}</td>
              <td style="padding:10px 0">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);
                    display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">
                    ${b.name[0].toUpperCase()}
                  </div>
                  <span style="font-size:14px;font-weight:600">${b.name}</span>
                </div>
              </td>
              <td style="padding:10px 0;text-align:right;font-size:13px">${b.count}</td>
              <td style="padding:10px 0;text-align:right;font-size:13px;font-weight:700">${Calculator.fmt(b.total)}</td>
              <td style="padding:10px 0;text-align:right;font-size:13px;color:var(--green)">${Calculator.fmt(b.paid)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  },

  // ─── Chart helper ─────────────────────────────────────────
  _makeChart(id, type, labels, datasets, extraOpts = {}, grouped = false) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    // Destroy old instance
    if (this._charts[id]) {
      this._charts[id].destroy();
      delete this._charts[id];
    }

    const isDoughnut = type === 'doughnut';

    this._charts[id] = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: !isDoughnut,
        plugins: {
          legend: {
            display: isDoughnut || grouped,
            position: 'bottom',
            labels: { color: '#8b949e', font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y ?? ctx.parsed;
                if (typeof v === 'number' && v > 100) {
                  return ` GH₵ ${Calculator.fmt(v)}`;
                }
                return ` ${v}`;
              },
            },
          },
        },
        scales: isDoughnut ? {} : {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b949e', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b949e', font: { size: 11 } } },
        },
        ...extraOpts,
      },
    });
  },
};
