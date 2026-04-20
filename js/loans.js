// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Loans Module
// CRUD, wizard, detail view
// ══════════════════════════════════════════════

const Loans = {
  _all     : [],   // all loans from DB
  _filtered: [],   // after search/tab filter
  _filter  : 'All',
  _currentLoan: null,
  _currentStep: 1,

  // ─── LOAD LIST ──────────────────────────────
  async loadList() {
    const { data, error } = await sb.from('loans')
      .select(`*, borrowers(full_name, phone)`)
      .eq('agent_id', App.agentId)
      .order('created_at', { ascending: false });

    if (error) { App.toast('Error loading loans', 'error'); return; }

    // Auto-mark overdue
    const today = App.today();
    this._all = (data || []).map(l => {
      if (l.status === 'Active' && l.end_date < today) l.status = 'Overdue';
      return l;
    });
    this._filtered = this._all;
    this._applyFilter();
  },

  _applyFilter() {
    let list = this._all;
    if (this._filter !== 'All') list = list.filter(l => l.status === this._filter);
    const q = (document.getElementById('loans-search')?.value || '').toLowerCase();
    if (q) list = list.filter(l => (l.borrowers?.full_name || '').toLowerCase().includes(q));
    this._filtered = list;
    this._renderList();
  },

  _renderList() {
    const el = document.getElementById('loans-list');
    if (!this._filtered.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="credit-card"></i></div>
        <h3>No loans found</h3><p>Try a different filter or create a new loan</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    el.innerHTML = this._filtered.map(l => this._loanItem(l)).join('');
    if (window.lucide) window.lucide.createIcons();
  },

  _loanItem(l) {
    const name       = l.borrowers?.full_name || 'Unknown';
    const phone      = l.borrowers?.phone || '';
    const initial    = name[0].toUpperCase();
    const owed       = l.total_repayable - l.amount_paid;
    const badge      = this._badge(l.status);
    const monthsPaid = Math.round(l.amount_paid / l.monthly_payment);
    const waBtn      = phone
      ? `<button class="wa-chip" title="WhatsApp reminder" onclick="event.stopPropagation(); Loans.whatsappReminder('${l.id}')"><i data-lucide="message-circle"></i></button>`
      : '';
    return `
      <div class="loan-item" onclick="App.navigate('loan-detail','${l.id}')">
        <div class="loan-avatar">${initial}</div>
        <div class="loan-item-info">
          <div class="loan-item-name">${name}</div>
          <div class="loan-item-sub">${l.duration_months} months · Started ${App.fmtDate(l.start_date)}</div>
          <div class="mt8 d-flex" style="gap:6px;align-items:center">${badge}${waBtn}</div>
        </div>
        <div class="loan-item-right">
          <div class="loan-amount owed">${Calculator.fmtShort(owed)}</div>
          <div class="text-muted" style="font-size:11px">still owed</div>
          <div class="text-muted" style="font-size:11px">${monthsPaid}/${l.duration_months} paid</div>
        </div>
      </div>`;
  },

  // Open a prefilled WhatsApp chat with the borrower.
  // Ghana phones are entered as 024xxxxxxx / 054xxxxxxx — wa.me/ needs
  // country code. We strip the leading 0 and prefix 233.
  whatsappReminder(loanId) {
    const loan = this._all.find(l => l.id === loanId) || this._currentLoan;
    if (!loan) return;
    const phone = (loan.borrowers?.phone || '').replace(/\D/g, '');
    if (!phone) { App.toast('No phone number on file', 'error'); return; }
    const wa = phone.startsWith('233') ? phone
             : phone.startsWith('0')  ? '233' + phone.slice(1)
             : phone;
    const name  = loan.borrowers?.full_name?.split(' ')[0] || 'there';
    const owed  = loan.total_repayable - loan.amount_paid;
    const today = App.today();
    const state = (loan.status === 'Overdue' || loan.end_date < today) ? 'overdue'
                : (loan.status === 'Completed') ? 'done'
                : 'upcoming';
    let msg;
    if (state === 'overdue') {
      msg = `Hi ${name}, this is a friendly reminder from E-EMAX Enterprise. ` +
            `Your loan is overdue and ${Calculator.fmt(owed)} is still outstanding. ` +
            `Please settle as soon as possible. Thank you.`;
    } else if (state === 'done') {
      msg = `Hi ${name}, thank you for completing your loan with E-EMAX Enterprise. ` +
            `We appreciate you.`;
    } else {
      msg = `Hi ${name}, quick reminder from E-EMAX Enterprise — your monthly ` +
            `payment of ${Calculator.fmt(loan.monthly_payment)} is coming up. ` +
            `Please get in touch if you need anything. Thank you.`;
    }
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
  },

  _badge(status) {
    const map = {
      Active: 'badge-active', Overdue: 'badge-overdue',
      Completed: 'badge-completed', Defaulted: 'badge-defaulted'
    };
    return `<span class="badge ${map[status]||'badge-active'}">${status}</span>`;
  },

  filterList(q) { this._applyFilter(); },

  setFilter(f, btn) {
    this._filter = f;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._applyFilter();
  },

  // ─── NEW LOAN WIZARD ────────────────────────
  openNewLoan() {
    this._currentStep = 1;
    // Reset form
    ['b-name','b-phone','b-address','b-occupation','b-ghana-card','b-dob',
     'g-name','g-phone','g-address','g-ghana-card',
     'w-name','w-phone','l-amount','l-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('l-months').value = '';
    document.getElementById('l-start').value  = App.today();
    document.getElementById('calc-preview-box').style.display = 'none';
    document.getElementById('b-photo-preview').style.display  = 'none';
    document.getElementById('b-id-preview').style.display     = 'none';
    this._showStep(1);
    App.navigate('new-loan');
  },

  _showStep(n) {
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`step-${i}`).style.display = (i === n) ? 'block' : 'none';
      const ws = document.getElementById(`ws-${i}`);
      ws.className = 'wizard-step ' + (i < n ? 'done' : i === n ? 'active' : '');
      ws.querySelector('.w-num').textContent = i < n ? '✓' : i;
    }
    this._currentStep = n;
  },

  wizardNext(step) {
    if (step === 1) {
      if (!document.getElementById('b-name').value.trim())  { App.toast('Please enter borrower name', 'error'); return; }
      if (!document.getElementById('b-phone').value.trim()) { App.toast('Please enter phone number', 'error'); return; }
      if (!document.getElementById('b-address').value.trim()){ App.toast('Please enter address', 'error'); return; }
    }
    if (step === 2) {
      if (!document.getElementById('g-name').value.trim())  { App.toast('Please enter guarantor name', 'error'); return; }
      if (!document.getElementById('g-phone').value.trim()) { App.toast('Please enter guarantor phone', 'error'); return; }
    }
    // Step 3 (witness) is optional — users can leave it blank and move on.
    if (step === 4) {
      const amt = document.getElementById('l-amount').value;
      const dur = document.getElementById('l-months').value;
      if (!amt || parseFloat(amt) <= 0)  { App.toast('Please enter loan amount', 'error'); return; }
      if (!dur)                           { App.toast('Please select duration', 'error'); return; }
      this._buildReview();
    }
    this._showStep(step + 1);
  },

  wizardBack(step) { this._showStep(step - 1); },

  updateCalcPreview() {
    const amt = parseFloat(document.getElementById('l-amount').value);
    const dur = parseInt(document.getElementById('l-months').value);
    if (!amt || !dur) { document.getElementById('calc-preview-box').style.display = 'none'; return; }
    const c = Calculator.calculate(amt, dur);
    if (!c) return;
    document.getElementById('calc-preview-box').style.display = 'block';
    document.getElementById('cp-principal').textContent   = Calculator.fmt(c.principal);
    document.getElementById('cp-fee').textContent         = `−${Calculator.fmt(c.processingFee)}`;
    document.getElementById('cp-monthly-int').textContent = Calculator.fmt(c.monthlyInterest);
    document.getElementById('cp-total-int').textContent   = Calculator.fmt(c.totalInterest);
    document.getElementById('cp-total').textContent       = Calculator.fmt(c.totalRepayable);
    document.getElementById('cp-monthly').textContent     = Calculator.fmt(c.monthlyPayment);
    document.getElementById('cp-penalty').textContent     = `+${Calculator.fmt(c.latePenalty)}`;
  },

  _buildReview() {
    const amt     = parseFloat(document.getElementById('l-amount').value);
    const dur     = parseInt(document.getElementById('l-months').value);
    const c       = Calculator.calculate(amt, dur);
    const start   = document.getElementById('l-start').value;
    const end     = Calculator.endDate(start, dur);
    const bName   = document.getElementById('b-name').value;
    const gName   = document.getElementById('g-name').value;
    const wName   = document.getElementById('w-name').value;

    document.getElementById('review-content').innerHTML = `
      <div class="card">
        <div class="card-title">Borrower</div>
        <div class="detail-row"><span class="dr-label">Name</span><span class="dr-value">${bName}</span></div>
        <div class="detail-row"><span class="dr-label">Phone</span><span class="dr-value">${document.getElementById('b-phone').value}</span></div>
        <div class="detail-row"><span class="dr-label">Guarantor</span><span class="dr-value">${gName}</span></div>
        <div class="detail-row"><span class="dr-label">Witness</span><span class="dr-value">${wName || '—'}</span></div>
      </div>
      <div class="card mt12">
        <div class="card-title">Loan Summary</div>
        <div class="detail-row"><span class="dr-label">Principal</span><span class="dr-value fw7">${Calculator.fmt(c.principal)}</span></div>
        <div class="detail-row"><span class="dr-label">Processing Fee (4%)</span><span class="dr-value text-red">${Calculator.fmt(c.processingFee)}</span></div>
        <div class="detail-row"><span class="dr-label">Duration</span><span class="dr-value">${dur} months</span></div>
        <div class="detail-row"><span class="dr-label">Monthly Interest</span><span class="dr-value text-gold">${Calculator.fmt(c.monthlyInterest)}</span></div>
        <div class="detail-row"><span class="dr-label">Total Interest</span><span class="dr-value text-gold">${Calculator.fmt(c.totalInterest)}</span></div>
        <div class="detail-row"><span class="dr-label">Total Repayable</span><span class="dr-value fw8">${Calculator.fmt(c.totalRepayable)}</span></div>
        <div class="detail-row"><span class="dr-label">Monthly Payment</span>
          <span class="dr-value" style="font-size:18px;color:var(--accent2);font-weight:800">${Calculator.fmt(c.monthlyPayment)}</span></div>
        <div class="detail-row"><span class="dr-label">Late Penalty</span><span class="dr-value text-red">+${Calculator.fmt(c.latePenalty)}</span></div>
        <div class="detail-row"><span class="dr-label">Start Date</span><span class="dr-value">${App.fmtDate(start)}</span></div>
        <div class="detail-row"><span class="dr-label">End Date</span><span class="dr-value">${App.fmtDate(end)}</span></div>
      </div>`;
  },

  async submitLoan() {
    const btn = document.getElementById('btn-submit-loan');
    btn.innerHTML = '<span class="spinner"></span> Saving…';
    btn.disabled = true;

    const amt   = parseFloat(document.getElementById('l-amount').value);
    const dur   = parseInt(document.getElementById('l-months').value);
    const start = document.getElementById('l-start').value;
    const c     = Calculator.calculate(amt, dur);

    try {
      // 1. Create borrower
      const { data: borrower, error: bErr } = await sb.from('borrowers').insert({
        agent_id        : App.agentId,
        full_name       : document.getElementById('b-name').value.trim(),
        phone           : document.getElementById('b-phone').value.trim(),
        address         : document.getElementById('b-address').value.trim(),
        ghana_card_number: document.getElementById('b-ghana-card').value.trim(),
        occupation      : document.getElementById('b-occupation').value.trim(),
        date_of_birth   : document.getElementById('b-dob').value || null,
      }).select('id').single();
      if (bErr) throw bErr;

      // 2. Upload photos if any
      await this._uploadPhoto('b-photo-input', `${App.agentId}/${borrower.id}/photo.jpg`, borrower.id, 'photo_url');
      await this._uploadPhoto('b-id-input',    `${App.agentId}/${borrower.id}/id.jpg`,    borrower.id, 'id_photo_url');

      // 3. Create guarantor
      const { data: guarantor } = await sb.from('guarantors').insert({
        agent_id    : App.agentId,
        borrower_id : borrower.id,
        full_name   : document.getElementById('g-name').value.trim(),
        phone       : document.getElementById('g-phone').value.trim(),
        address     : document.getElementById('g-address').value.trim(),
        relationship: document.getElementById('g-relationship').value,
        ghana_card_number: document.getElementById('g-ghana-card').value.trim(),
      }).select('id').single();

      // 4. Create witness — only if the user actually filled one in.
      const wName = document.getElementById('w-name').value.trim();
      let witness = null;
      if (wName) {
        const { data: w } = await sb.from('witnesses').insert({
          agent_id    : App.agentId,
          borrower_id : borrower.id,
          full_name   : wName,
          phone       : document.getElementById('w-phone').value.trim(),
        }).select('id').single();
        witness = w;
      }

      // 5. Create loan
      const { data: loan, error: lErr } = await sb.from('loans').insert({
        agent_id            : App.agentId,
        borrower_id         : borrower.id,
        guarantor_id        : guarantor?.id,
        witness_id          : witness?.id,
        principal           : c.principal,
        processing_fee      : c.processingFee,
        interest_rate       : LOAN_CONFIG.MONTHLY_INTEREST_RATE * 100,
        duration_months     : dur,
        monthly_payment     : c.monthlyPayment,
        total_interest      : c.totalInterest,
        total_repayable     : c.totalRepayable,
        amount_paid         : 0,
        start_date          : start,
        end_date            : Calculator.endDate(start, dur),
        status              : 'Active',
        processing_fee_paid : document.getElementById('l-fee-paid').checked,
        notes               : document.getElementById('l-notes').value.trim(),
      }).select('id').single();
      if (lErr) throw lErr;

      // 6. Log activity
      await sb.from('activity_log').insert({
        agent_id      : App.agentId,
        activity_type : 'LOAN_CREATED',
        description   : `New loan of ${Calculator.fmt(amt)} issued to ${document.getElementById('b-name').value.trim()} for ${dur} months`,
        borrower_name : document.getElementById('b-name').value.trim(),
        loan_id       : loan.id,
      });

      App.toast(`Loan issued to ${document.getElementById('b-name').value.trim()}`, 'success');
      App.navigate('loans');
      this.loadList();

    } catch (err) {
      App.toast(`Error: ${err.message}`, 'error', 5000);
      btn.innerHTML = 'Issue Loan';
      btn.disabled  = false;
    }
  },

  async _uploadPhoto(inputId, path, borrowerId, field) {
    const input = document.getElementById(inputId);
    if (!input || !input.files.length) return;
    const file = input.files[0];
    const { data } = await sb.storage.from('loan-docs').upload(path, file, { upsert: true });
    if (data) {
      const { data: { publicUrl } } = sb.storage.from('loan-docs').getPublicUrl(path);
      await sb.from('borrowers').update({ [field]: publicUrl }).eq('id', borrowerId);
    }
  },

  previewPhoto(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(input.files[0]);
    }
  },

  // ─── LOAN DETAIL ─────────────────────────────
  async loadDetail(loanId) {
    const { data: loan, error } = await sb.from('loans')
      .select(`*, borrowers(*), guarantors(*), witnesses(*)`)
      .eq('id', loanId).single();
    if (error || !loan) { App.toast('Loan not found', 'error'); return; }

    // Auto-update overdue
    if (loan.status === 'Active' && loan.end_date < App.today()) {
      await sb.from('loans').update({ status: 'Overdue' }).eq('id', loanId);
      loan.status = 'Overdue';
    }

    this._currentLoan = loan;
    document.getElementById('loan-detail-title').textContent = loan.borrowers?.full_name || 'Loan';
    document.getElementById('loan-detail-badge').innerHTML = this._badge(loan.status);

    // Load payments
    const { data: payments } = await sb.from('payments')
      .select('*').eq('loan_id', loanId).order('payment_date');

    const paidPct    = Calculator.paidPercent(loan.amount_paid, loan.total_repayable);
    const owed       = loan.total_repayable - loan.amount_paid;
    const monthsPaid = payments?.length || 0;
    const nextDue    = Calculator.daysUntilDue(loan.start_date, monthsPaid, loan.duration_months);

    document.getElementById('loan-detail-content').innerHTML = `
      <!-- Progress -->
      <div class="card">
        <div class="d-flex gap8" style="justify-content:space-between;margin-bottom:12px">
          <div>
            <div class="num-xl">${Calculator.fmt(owed)}</div>
            <div class="text-muted">still owed</div>
          </div>
          <div style="text-align:right">
            <div class="num-xl" style="color:var(--green)">${Calculator.fmt(loan.amount_paid)}</div>
            <div class="text-muted">collected</div>
          </div>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${paidPct}%"></div></div>
          <div class="progress-label"><span>${paidPct}% paid</span><span>${monthsPaid}/${loan.duration_months} months</span></div>
        </div>
        ${nextDue !== null ? `<div class="mt12 text-center text-muted due-note">
          ${nextDue < 0
            ? `<span class="text-red fw7">Overdue by ${Math.abs(nextDue)} days</span>`
            : nextDue === 0
            ? `<span class="text-gold fw7">Payment due today</span>`
            : `Next payment in <strong>${nextDue} days</strong>`}</div>` : ''}
        ${loan.borrowers?.phone && loan.status !== 'Completed' ? `
        <button class="btn btn-wa btn-full mt16" onclick="Loans.whatsappReminder('${loan.id}')">
          <i data-lucide="message-circle"></i> Send WhatsApp reminder
        </button>` : ''}
      </div>

      <!-- Record Payment -->
      ${loan.status !== 'Completed' ? `
      <div class="card mt12" id="record-payment-card">
        <div class="card-title">Record Payment</div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount Received (GHS)</label>
            <input id="pay-amount" type="number" class="form-input"
              placeholder="${Calculator.fmt(loan.monthly_payment)}"
              value="${loan.monthly_payment}" />
          </div>
          <div class="form-group">
            <label>Payment Date</label>
            <input id="pay-date" type="date" class="form-input" value="${App.today()}" />
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <input id="pay-late" type="checkbox" style="accent-color:var(--red);width:16px;height:16px">
          <label for="pay-late" style="font-size:13px;color:var(--text2)">
            Late payment — add penalty (${Calculator.fmt(loan.monthly_payment * LOAN_CONFIG.LATE_PENALTY_RATE)})
          </label>
        </div>
        <button class="btn btn-success btn-full" onclick="Payments.record('${loan.id}')">
          <i data-lucide="check"></i> Record Payment
        </button>
      </div>` : `<div class="card mt12 text-center" style="color:var(--green)">
        <div class="done-icon"><i data-lucide="check-circle-2"></i></div>
        <div class="fw7">Loan fully repaid</div></div>`}

      <!-- Loan Details -->
      <div class="card mt12">
        <div class="card-title">Loan Details</div>
        <div class="detail-row"><span class="dr-label">Principal</span><span class="dr-value">${Calculator.fmt(loan.principal)}</span></div>
        <div class="detail-row"><span class="dr-label">Processing Fee</span><span class="dr-value text-red">${Calculator.fmt(loan.processing_fee)}</span></div>
        <div class="detail-row"><span class="dr-label">Monthly Payment</span><span class="dr-value fw8" style="color:var(--accent2)">${Calculator.fmt(loan.monthly_payment)}</span></div>
        <div class="detail-row"><span class="dr-label">Total Interest</span><span class="dr-value text-gold">${Calculator.fmt(loan.total_interest)}</span></div>
        <div class="detail-row"><span class="dr-label">Total Repayable</span><span class="dr-value fw7">${Calculator.fmt(loan.total_repayable)}</span></div>
        <div class="detail-row"><span class="dr-label">Duration</span><span class="dr-value">${loan.duration_months} months</span></div>
        <div class="detail-row"><span class="dr-label">Start Date</span><span class="dr-value">${App.fmtDate(loan.start_date)}</span></div>
        <div class="detail-row"><span class="dr-label">End Date</span><span class="dr-value">${App.fmtDate(loan.end_date)}</span></div>
        <div class="detail-row"><span class="dr-label">Processing Fee Paid</span><span class="dr-value">${loan.processing_fee_paid ? 'Yes' : 'No'}</span></div>
        ${loan.notes ? `<div class="detail-row"><span class="dr-label">Notes</span><span class="dr-value">${loan.notes}</span></div>` : ''}
      </div>

      <!-- Borrower -->
      <div class="card mt12">
        <div class="card-title">Borrower</div>
        ${loan.borrowers?.photo_url ? `<img src="${loan.borrowers.photo_url}" class="photo-preview" style="margin-bottom:12px">` : ''}
        <div class="detail-row"><span class="dr-label">Name</span><span class="dr-value">${loan.borrowers?.full_name}</span></div>
        <div class="detail-row"><span class="dr-label">Phone</span><span class="dr-value">${loan.borrowers?.phone || '—'}</span></div>
        <div class="detail-row"><span class="dr-label">Address</span><span class="dr-value">${loan.borrowers?.address || '—'}</span></div>
        <div class="detail-row"><span class="dr-label">Ghana Card</span><span class="dr-value">${loan.borrowers?.ghana_card_number || '—'}</span></div>
      </div>

      <!-- Guarantor -->
      ${loan.guarantors ? `<div class="card mt12">
        <div class="card-title">Guarantor</div>
        <div class="detail-row"><span class="dr-label">Name</span><span class="dr-value">${loan.guarantors.full_name}</span></div>
        <div class="detail-row"><span class="dr-label">Phone</span><span class="dr-value">${loan.guarantors.phone || '—'}</span></div>
        <div class="detail-row"><span class="dr-label">Relationship</span><span class="dr-value">${loan.guarantors.relationship || '—'}</span></div>
      </div>` : ''}

      <!-- Witness -->
      ${loan.witnesses ? `<div class="card mt12">
        <div class="card-title">Witness</div>
        <div class="detail-row"><span class="dr-label">Name</span><span class="dr-value">${loan.witnesses.full_name}</span></div>
        <div class="detail-row"><span class="dr-label">Phone</span><span class="dr-value">${loan.witnesses.phone || '—'}</span></div>
      </div>` : ''}

      <!-- Payment History -->
      <div class="card mt12">
        <div class="card-title">🧾 Payment History (${payments?.length || 0} payments)</div>
        ${payments?.length ? payments.map((p, i) => `
          <div class="payment-row">
            <div class="payment-month ${p.is_late ? 'late' : ''}">M${p.month_number || i+1}</div>
            <div class="payment-info">
              <div class="amount">${Calculator.fmt(p.amount_paid)}
                ${p.is_late ? `<span style="font-size:11px;color:var(--red)"> +penalty ${Calculator.fmt(p.penalty_amount)}</span>` : ''}
              </div>
              <div class="date">${App.fmtDate(p.payment_date)} ${p.is_late ? '⚠️ Late' : '✅'}</div>
            </div>
          </div>`).join('')
        : `<div class="text-muted" style="padding:8px 0">No payments recorded yet</div>`}
      </div>

      <!-- Danger zone -->
      <div class="mt24 text-center">
        <button class="btn btn-ghost btn-sm" onclick="Loans.markDefaulted('${loan.id}')" style="color:var(--red);border-color:var(--red)">
          Mark as Defaulted
        </button>
      </div>
    `;
  },

  async markDefaulted(loanId) {
    if (!confirm('Mark this loan as defaulted?')) return;
    await sb.from('loans').update({ status: 'Defaulted' }).eq('id', loanId);
    App.toast('Loan marked as defaulted', 'info');
    this.loadDetail(loanId);
  },
};
