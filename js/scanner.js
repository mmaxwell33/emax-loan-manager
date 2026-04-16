// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Scanner Module
// Document scan (Tesseract OCR), enrollment links
// ══════════════════════════════════════════════

const Scanner = {
  _worker: null,

  // ─── Handle uploaded file ──────────────────
  async handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = document.getElementById('scan-preview-img');
      img.src = e.target.result;

      document.getElementById('scanner-upload-zone').style.display = 'none';
      document.getElementById('scanner-review').style.display      = 'block';

      const statusEl = document.getElementById('ocr-status');
      statusEl.innerHTML = `<div class="ocr-loading">
        <span class="spinner" style="width:16px;height:16px;display:inline-block;
          border:2px solid var(--accent);border-top-color:transparent;
          border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;vertical-align:middle"></span>
        Reading document… this takes about 10 seconds
      </div>`;

      // Set today as default date
      document.getElementById('scan-date').value = App.today();

      // Run OCR
      await this._runOCR(e.target.result, statusEl);
    };
    reader.readAsDataURL(file);
  },

  async _runOCR(imageData, statusEl) {
    try {
      // Use Tesseract.js v5 API
      const { createWorker } = Tesseract;
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        langPath:   'https://tessdata.projectnaptha.com/4.0.0',
        corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
        logger: m => {
          if (m.status === 'recognizing text' && statusEl) {
            const pct = Math.round((m.progress || 0) * 100);
            statusEl.innerHTML = `<div class="ocr-loading">📖 Reading… ${pct}%</div>`;
          }
        }
      });

      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      statusEl.innerHTML = `<div style="color:var(--green);font-size:13px">✅ Document read — please review below</div>`;
      this._extractFields(text);

    } catch (err) {
      statusEl.innerHTML = `<div style="color:var(--text2);font-size:12px">
        📝 Could not auto-read — please type the details below manually
      </div>`;
      console.warn('OCR error:', err);
    }
  },

  _extractFields(text) {
    // Clean the text
    const clean = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');

    // Try to extract name — look for common patterns in Ghanaian loan docs
    const nameMatch = clean.match(/(?:name|borrower|client)[:\s]+([A-Za-z ]{3,40})/i);
    if (nameMatch) {
      document.getElementById('scan-name').value = this._clean(nameMatch[1]);
    }

    // Phone — Ghanaian numbers 0XX XXX XXXX or +233
    const phoneMatch = clean.match(/(?:0[235789]\d[\s-]?\d{3}[\s-]?\d{4}|\+233\d{9})/);
    if (phoneMatch) {
      document.getElementById('scan-phone').value = phoneMatch[0].replace(/[\s-]/g, '');
    }

    // Amount — look for numbers with GHS, GH₵, cedis, or just large numbers
    const amountMatch = clean.match(/(?:GH[₵S]|amount|loan|cedis)[:\s]*([0-9,]+(?:\.\d{2})?)/i)
      || clean.match(/\b([1-9]\d{2,6}(?:\.\d{2})?)\b/);
    if (amountMatch) {
      document.getElementById('scan-amount').value = amountMatch[1].replace(/,/g, '');
    }

    // Duration — months
    const durMatch = clean.match(/(\d+)\s*(?:months?|mths?|mo\.?)/i);
    if (durMatch) {
      const m = parseInt(durMatch[1]);
      if (m >= 1 && m <= 12) {
        document.getElementById('scan-months').value = m;
      }
    }

    // Address
    const addrMatch = clean.match(/(?:address|residence|location)[:\s]+([A-Za-z0-9,\s./-]{5,80})/i);
    if (addrMatch) {
      document.getElementById('scan-address').value = this._clean(addrMatch[1]);
    }

    // Date — various formats
    const dateMatch = clean.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      try {
        const parts = dateMatch[1].split(/[\/\-]/);
        if (parts.length === 3) {
          const year  = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          const month = parts[1].padStart(2, '0');
          const day   = parts[0].padStart(2, '0');
          document.getElementById('scan-date').value = `${year}-${month}-${day}`;
        }
      } catch(e) {}
    }

    // Put any remaining useful text in notes
    if (text.length > 20) {
      document.getElementById('scan-notes').value =
        `Extracted from scanned document:\n${text.slice(0, 500)}`;
    }
  },

  _clean(str) {
    return str.trim().replace(/\s+/g, ' ').split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  },

  // ─── Create loan from scanned data ─────────
  async createLoanFromScan() {
    const name   = document.getElementById('scan-name').value.trim();
    const phone  = document.getElementById('scan-phone').value.trim();
    const amount = parseFloat(document.getElementById('scan-amount').value);
    const months = parseInt(document.getElementById('scan-months').value);

    if (!name)           { App.toast('Please enter borrower name', 'error'); return; }
    if (!phone)          { App.toast('Please enter phone number', 'error'); return; }
    if (!amount || amount <= 0) { App.toast('Please enter a valid amount', 'error'); return; }
    if (!months)         { App.toast('Please select loan duration', 'error'); return; }

    const c     = Calculator.calculate(amount, months);
    const start = document.getElementById('scan-date').value || App.today();
    const end   = Calculator.endDate(start, months);

    try {
      const { data: borrower, error: bErr } = await sb.from('borrowers').insert({
        agent_id  : App.agentId,
        full_name : name,
        phone,
        address   : document.getElementById('scan-address').value.trim(),
        notes     : document.getElementById('scan-notes').value.trim(),
      }).select('id').single();
      if (bErr) throw bErr;

      // Upload scanned image as borrower doc
      const img = document.getElementById('scan-preview-img');
      if (img.src && img.src.startsWith('data:')) {
        const blob = await (await fetch(img.src)).blob();
        const path = `${App.agentId}/${borrower.id}/scan.jpg`;
        await sb.storage.from('loan-docs').upload(path, blob, { upsert: true });
        const { data: { publicUrl } } = sb.storage.from('loan-docs').getPublicUrl(path);
        await sb.from('borrowers').update({ id_photo_url: publicUrl }).eq('id', borrower.id);
      }

      const { data: loan, error: lErr } = await sb.from('loans').insert({
        agent_id        : App.agentId,
        borrower_id     : borrower.id,
        principal       : c.principal,
        processing_fee  : c.processingFee,
        interest_rate   : LOAN_CONFIG.MONTHLY_INTEREST_RATE * 100,
        duration_months : months,
        monthly_payment : c.monthlyPayment,
        total_interest  : c.totalInterest,
        total_repayable : c.totalRepayable,
        amount_paid     : 0,
        start_date      : start,
        end_date        : end,
        status          : 'Active',
        notes           : document.getElementById('scan-notes').value.trim(),
      }).select('id').single();
      if (lErr) throw lErr;

      await sb.from('activity_log').insert({
        agent_id      : App.agentId,
        activity_type : 'LOAN_CREATED',
        description   : `Scanned loan of ${Calculator.fmt(amount)} issued to ${name} for ${months} months`,
        borrower_name : name,
        loan_id       : loan.id,
      });

      App.toast(`✅ Loan created for ${name}!`, 'success');
      this.reset();
      App.navigate('loans');

    } catch(err) {
      App.toast(`Error: ${err.message}`, 'error', 5000);
    }
  },

  reset() {
    document.getElementById('scanner-upload-zone').style.display = 'block';
    document.getElementById('scanner-review').style.display      = 'none';
    document.getElementById('scan-camera').value  = '';
    document.getElementById('scan-gallery').value = '';
    ['scan-name','scan-phone','scan-amount','scan-address','scan-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('scan-months').value = '3';
    document.getElementById('scan-date').value   = App.today();
  },

  // ─── Enrollment link ────────────────────────
  getEnrollLink() {
    const base = window.location.origin + window.location.pathname.replace('index.html','');
    return `${base}enrollment.html?agent=${App.agentId}`;
  },

  copyEnrollLink() {
    const link = this.getEnrollLink();
    navigator.clipboard.writeText(link)
      .then(() => App.toast('✅ Enrollment link copied!', 'success'))
      .catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        App.toast('✅ Link copied!', 'success');
      });
  },

  // ─── Load pending applications ──────────────
  async loadApplications() {
    const { data } = await sb.from('enrollment_submissions')
      .select('*').eq('agent_id', App.agentId)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    const el = document.getElementById('applications-list');
    if (!el) return;

    // Update sidebar badge
    const badge = document.getElementById('sidebar-app-count');
    if (badge) {
      badge.textContent = (data || []).length;
      badge.style.display = (data || []).length > 0 ? 'flex' : 'none';
    }

    if (!data?.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No pending applications</h3>
        <p>Share the enrollment link with new borrowers to get applications</p>
      </div>`;
      return;
    }

    el.innerHTML = data.map(app => `
      <div class="loan-item" style="flex-wrap:wrap;gap:12px">
        <div class="loan-avatar">${(app.full_name||'?')[0].toUpperCase()}</div>
        <div class="loan-item-info" style="flex:1;min-width:180px">
          <div class="loan-item-name">${app.full_name}</div>
          <div class="loan-item-sub">${app.phone} · ${App.fmtDate(app.created_at)}</div>
          <div class="loan-item-sub">
            Requested: <strong>${Calculator.fmt(app.amount_requested || 0)}</strong>
            for <strong>${app.duration_months || '?'} months</strong>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-success btn-sm" onclick="Scanner.approveApp('${app.id}')">✅ Approve</button>
          <button class="btn btn-ghost btn-sm" onclick="Scanner.rejectApp('${app.id}')" style="color:var(--red)">✗ Reject</button>
        </div>
      </div>`).join('');
  },

  async approveApp(appId) {
    const { data: app } = await sb.from('enrollment_submissions')
      .select('*').eq('id', appId).single();
    if (!app) return;

    // Pre-fill the loan wizard with this applicant's data
    App.navigate('new-loan');
    // Give the DOM a moment to render
    setTimeout(() => {
      document.getElementById('b-name').value    = app.full_name || '';
      document.getElementById('b-phone').value   = app.phone || '';
      document.getElementById('b-address').value = app.address || '';
      document.getElementById('b-ghana-card').value = app.ghana_card_number || '';
      document.getElementById('b-occupation').value  = app.occupation || '';

      if (app.guarantor_name)  document.getElementById('g-name').value  = app.guarantor_name;
      if (app.guarantor_phone) document.getElementById('g-phone').value = app.guarantor_phone;
      if (app.witness_name)    document.getElementById('w-name').value  = app.witness_name;
      if (app.witness_phone)   document.getElementById('w-phone').value = app.witness_phone;

      if (app.amount_requested) {
        document.getElementById('l-amount').value = app.amount_requested;
        Loans.setAmount(app.amount_requested);
      }
      if (app.duration_months) {
        document.getElementById('l-months').value = app.duration_months;
        Loans.setMonths(app.duration_months);
      }
      Loans.updateCalcPreview();
    }, 200);

    // Mark as approved
    await sb.from('enrollment_submissions').update({ status: 'Approved' }).eq('id', appId);
    App.toast('✅ Application loaded into loan wizard — review and submit', 'success', 4000);
  },

  async rejectApp(appId) {
    if (!confirm('Reject this application?')) return;
    await sb.from('enrollment_submissions').update({ status: 'Rejected' }).eq('id', appId);
    App.toast('Application rejected', 'info');
    this.loadApplications();
  },
};
