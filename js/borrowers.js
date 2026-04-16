// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Borrowers Module
// ══════════════════════════════════════════════

const Borrowers = {
  _all: [],

  async loadList() {
    const { data, error } = await sb.from('borrowers')
      .select('*, loans(id, status, amount_paid, total_repayable)')
      .eq('agent_id', App.agentId)
      .order('full_name');

    if (error) { App.toast('Error loading borrowers', 'error'); return; }
    this._all = data || [];
    this._render(this._all);
  },

  filter(q) {
    const list = q
      ? this._all.filter(b => b.full_name.toLowerCase().includes(q.toLowerCase()))
      : this._all;
    this._render(list);
  },

  _render(list) {
    const el = document.getElementById('borrowers-list');
    if (!list.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-icon">👥</div><h3>No borrowers found</h3>
        <p>Create a loan to add borrowers</p></div>`;
      return;
    }
    el.innerHTML = list.map(b => {
      const activeLoans = (b.loans || []).filter(l => l.status === 'Active' || l.status === 'Overdue');
      const totalOwed   = activeLoans.reduce((s, l) => s + (l.total_repayable - l.amount_paid), 0);
      const initial     = b.full_name[0].toUpperCase();
      return `
        <div class="loan-item" onclick="App.navigate('borrower-detail','${b.id}')">
          <div class="loan-avatar" style="background:linear-gradient(135deg,#14b8a6,#22c55e)">${initial}</div>
          <div class="loan-item-info">
            <div class="loan-item-name">${b.full_name}</div>
            <div class="loan-item-sub">${b.phone || '—'} · ${(b.loans||[]).length} loan(s)</div>
          </div>
          <div class="loan-item-right">
            ${totalOwed > 0
              ? `<div class="loan-amount owed">${Calculator.fmtShort(totalOwed)}</div>
                 <div class="text-muted" style="font-size:11px">owed</div>`
              : `<div style="color:var(--green);font-size:13px;font-weight:600">All clear ✅</div>`}
          </div>
        </div>`;
    }).join('');
  },

  async loadDetail(borrowerId) {
    const { data: b, error } = await sb.from('borrowers')
      .select('*').eq('id', borrowerId).single();
    if (error || !b) return;

    document.getElementById('borrower-detail-name').textContent = b.full_name;

    const { data: loans } = await sb.from('loans')
      .select('*, payments(count)')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false });

    document.getElementById('borrower-detail-content').innerHTML = `
      <!-- Profile -->
      <div class="card">
        <div class="d-flex gap12" style="margin-bottom:14px">
          ${b.photo_url
            ? `<img src="${b.photo_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--border)">`
            : `<div class="loan-avatar" style="width:64px;height:64px;font-size:24px;background:linear-gradient(135deg,#14b8a6,#22c55e)">${b.full_name[0].toUpperCase()}</div>`}
          <div>
            <div style="font-size:18px;font-weight:800">${b.full_name}</div>
            <div class="text-muted">${b.phone || '—'}</div>
            <div class="text-muted">${b.occupation || ''}</div>
          </div>
        </div>
        <div class="detail-row"><span class="dr-label">Address</span><span class="dr-value">${b.address || '—'}</span></div>
        <div class="detail-row"><span class="dr-label">Ghana Card</span><span class="dr-value">${b.ghana_card_number || '—'}</span></div>
        <div class="detail-row"><span class="dr-label">Date of Birth</span><span class="dr-value">${App.fmtDate(b.date_of_birth)}</span></div>
        ${b.id_photo_url
          ? `<div class="mt12"><div class="text-muted" style="font-size:12px;margin-bottom:6px">GHANA CARD</div>
             <img src="${b.id_photo_url}" style="width:100%;border-radius:12px;border:1px solid var(--border)"></div>` : ''}
      </div>

      <!-- Loan History -->
      <div class="section-divider">Loan History (${(loans||[]).length})</div>
      ${(loans||[]).length === 0
        ? `<div class="empty-state" style="padding:30px 0">
             <div class="empty-icon">💳</div><h3>No loans yet</h3></div>`
        : (loans||[]).map(l => `
          <div class="loan-item" onclick="App.navigate('loan-detail','${l.id}')" style="background:var(--card);border-radius:14px;margin-bottom:8px">
            <div class="loan-item-info">
              <div class="loan-item-name">${Calculator.fmt(l.principal)} · ${l.duration_months} months</div>
              <div class="loan-item-sub">Started ${App.fmtDate(l.start_date)}</div>
            </div>
            <div class="loan-item-right">
              ${Loans._badge(l.status)}
              <div class="text-muted mt8" style="font-size:12px">
                ${Calculator.fmt(l.amount_paid)} / ${Calculator.fmt(l.total_repayable)}
              </div>
            </div>
          </div>`).join('')}
    `;
  },
};
