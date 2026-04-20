// ══════════════════════════════════════════════
// E-EMAX ENTERPRISE — Intelligent Document Scanner
// Smart OCR with loan-doc validation, confidence scoring
// ══════════════════════════════════════════════

const Scanner = {

  // ─── Keywords that must appear in a real loan document ──
  LOAN_KEYWORDS: [
    'loan', 'credit', 'borrow', 'lend', 'repay', 'amount', 'interest',
    'guarantor', 'witness', 'principal', 'payment', 'month', 'facility',
    'cedis', 'ghs', 'gh₵', 'enterprise', 'emax', 'e-max', 'finance',
    'signature', 'date', 'duration', 'processing', 'fee', 'penalty',
    'agreement', 'contract', 'terms', 'installment', 'disburse',
    // Twi / local words common on Ghanaian docs
    'sika', 'adehye'
  ],

  // Minimum number of loan keywords needed to accept a document
  MIN_KEYWORD_HITS: 2,

  // ─── Handle uploaded file ──────────────────
  async handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      App.toast('Please upload an image file (photo of document)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = document.getElementById('scan-preview-img');
      img.src = e.target.result;

      document.getElementById('scanner-upload-zone').style.display = 'none';
      document.getElementById('scanner-review').style.display      = 'block';

      // Hide any previous validation banner
      const validBanner = document.getElementById('scan-validation-banner');
      if (validBanner) validBanner.remove();

      const statusEl = document.getElementById('ocr-status');
      statusEl.innerHTML = `<div class="ocr-loading">
        <span class="spinner" style="width:16px;height:16px;display:inline-block;
          border:2px solid var(--accent);border-top-color:transparent;
          border-radius:50%;animation:spin 0.6s linear infinite;
          margin-right:8px;vertical-align:middle"></span>
        Analysing document… please wait
      </div>`;

      document.getElementById('scan-date').value = App.today();
      await this._runOCR(e.target.result, statusEl);
    };
    reader.readAsDataURL(file);
  },

  // ─── OCR engine ────────────────────────────
  async _runOCR(imageData, statusEl) {
    try {
      const { createWorker } = Tesseract;
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        langPath:   'https://tessdata.projectnaptha.com/4.0.0',
        corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            statusEl.innerHTML = `<div class="ocr-loading">
              <span class="spinner" style="width:14px;height:14px;display:inline-block;
                border:2px solid var(--accent);border-top-color:transparent;
                border-radius:50%;animation:spin 0.6s linear infinite;
                margin-right:6px;vertical-align:middle"></span>
              Reading… ${pct}%
            </div>`;
          }
        }
      });

      const { data: { text, confidence } } = await worker.recognize(imageData);
      await worker.terminate();

      // ── Validate: is this actually a loan document? ──
      const validation = this._validateDocument(text);

      if (!validation.isValid) {
        this._showInvalidBanner(validation, statusEl);
        return;
      }

      // ── Valid loan document — extract fields ──
      const fields = this._extractFields(text);
      this._populateForm(fields);
      this._showConfidenceReport(fields, validation, confidence, statusEl);

    } catch (err) {
      document.getElementById('ocr-status').innerHTML = `
        <div style="color:var(--yellow);font-size:13px;padding:8px 0">
          ⚠️ Could not auto-read — fill in the details below manually
        </div>`;
      console.warn('OCR error:', err);
    }
  },

  // ─── Document validation ───────────────────
  _validateDocument(text) {
    const lower = text.toLowerCase();
    const hits = this.LOAN_KEYWORDS.filter(kw => lower.includes(kw));
    const isValid = hits.length >= this.MIN_KEYWORD_HITS;

    return {
      isValid,
      hits,
      score: hits.length,
      wordCount: text.trim().split(/\s+/).length,
    };
  },

  _showInvalidBanner(validation, statusEl) {
    // Update status
    statusEl.innerHTML = `
      <div style="color:var(--red);font-size:13px;font-weight:600">
        ❌ Document not recognised as a loan record
      </div>`;

    // Insert banner above the form
    const form = document.getElementById('scan-form');
    if (form && !document.getElementById('scan-validation-banner')) {
      const banner = document.createElement('div');
      banner.id = 'scan-validation-banner';
      banner.style.cssText = `
        background: rgba(239,68,68,0.12);
        border: 1px solid var(--red);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: center;
      `;
      banner.innerHTML = `
        <div style="font-size:28px;margin-bottom:8px">📄❌</div>
        <div style="color:var(--red);font-weight:700;font-size:15px;margin-bottom:6px">
          Invalid Document
        </div>
        <div style="color:var(--text2);font-size:13px;line-height:1.5;margin-bottom:12px">
          This photo does not appear to be a loan document.<br>
          ${validation.wordCount < 20
            ? 'The image contains very little text — make sure the document is clear and fully in frame.'
            : 'No loan-related terms were found. Please scan an actual loan agreement or application form.'}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="Scanner.reset()"
            style="border-color:var(--red);color:var(--red)">
            📷 Try a Different Photo
          </button>
          <button class="btn btn-ghost btn-sm" onclick="Scanner._dismissBanner()"
            style="color:var(--text2)">
            ✏️ Enter Manually Instead
          </button>
        </div>
      `;
      form.prepend(banner);
    }

    // Disable the submit button
    const submitBtn = document.getElementById('scan-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.4';
    }
  },

  _dismissBanner() {
    const banner = document.getElementById('scan-validation-banner');
    if (banner) banner.remove();
    const submitBtn = document.getElementById('scan-submit-btn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
    document.getElementById('ocr-status').innerHTML = `
      <div style="color:var(--text2);font-size:12px">
        ✏️ Manual entry mode — fill in the details below
      </div>`;
  },

  // ─── Field extraction (E-EMAX specific) ────
  _extractFields(rawText) {
    const text  = rawText;
    const clean = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    const lower = clean.toLowerCase();

    const fields = {
      name:           { value: '', confidence: 0 },
      phone:          { value: '', confidence: 0 },
      amount:         { value: '', confidence: 0 },
      months:         { value: '', confidence: 0 },
      address:        { value: '', confidence: 0 },
      date:           { value: '', confidence: 0 },
      ghanaCard:      { value: '', confidence: 0 },
      occupation:     { value: '', confidence: 0 },
      guarantorName:  { value: '', confidence: 0 },
      guarantorPhone: { value: '', confidence: 0 },
      witnessName:    { value: '', confidence: 0 },
      notes:          { value: '', confidence: 0 },
    };

    // ── Borrower name ──
    const namePatterns = [
      /(?:name\s+of\s+borrower|borrower(?:'s)?\s+name|applicant(?:'s)?\s+name|client(?:'s)?\s+name|full\s+name)[:\s]+([A-Za-z ]{4,45})/i,
      /(?:i[,\s]+|hereby[,\s]+)?([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?)[,\s]+(?:of|residing|located)/,
      /(?:^|\n)([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?)\s*(?:\n|,)/m,
    ];
    for (const p of namePatterns) {
      const m = clean.match(p);
      if (m && m[1] && m[1].trim().length > 3) {
        fields.name = { value: this._titleCase(m[1]), confidence: 90 };
        break;
      }
    }

    // ── Phone number — Ghanaian formats ──
    const phoneMatch = clean.match(/(?:\+233|0)(?:[235789]\d)[\s-]?\d{3}[\s-]?\d{4}/);
    if (phoneMatch) {
      fields.phone = { value: phoneMatch[0].replace(/[\s-]/g, ''), confidence: 95 };
    }

    // ── Loan amount — GHS, GH₵, cedis, or bare number ──
    const amtPatterns = [
      /(?:amount|loan|principal|sum|cedis|GH[₵$S])[:\s]+(?:GH[₵$S])?\s*([0-9,]+(?:\.\d{2})?)/i,
      /GH[₵$S]\s*([0-9,]+(?:\.\d{2})?)/i,
      /([0-9,]{3,7}(?:\.\d{2})?)\s*(?:cedis|GH[₵$S])/i,
    ];
    for (const p of amtPatterns) {
      const m = clean.match(p);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val >= 100 && val <= 500000) {
          fields.amount = { value: val.toString(), confidence: 85 };
          break;
        }
      }
    }

    // ── Duration in months ──
    const durPatterns = [
      /(\d+)\s*(?:months?|mths?|mo\.?)/i,
      /period\s*(?:of\s*)?(\d+)/i,
      /duration[:\s]+(\d+)/i,
    ];
    for (const p of durPatterns) {
      const m = clean.match(p);
      if (m) {
        const months = parseInt(m[1]);
        if (months >= 1 && months <= 12) {
          fields.months = { value: months.toString(), confidence: 90 };
          break;
        }
      }
    }

    // ── Address ──
    const addrMatch = clean.match(/(?:address|residence|location|residing\s+at|living\s+at)[:\s]+([A-Za-z0-9,.\s\/-]{8,100}?)(?:\.|,\s*[A-Z]|phone|tel|mob|ghan|wit)/i);
    if (addrMatch) {
      fields.address = { value: this._clean(addrMatch[1]), confidence: 75 };
    }

    // ── Ghana Card / National ID ──
    const cardMatch = clean.match(/(?:ghana\s*card|national\s*id|gh[a-z]*\s*card|id\s*(?:no|number|#))[:\s#]*([A-Z0-9\-]{8,20})/i)
      || clean.match(/\b(GHA-\d{9}-\d)\b/i)
      || clean.match(/\b([A-Z]{3}\d{9,12}[A-Z0-9])\b/);
    if (cardMatch) {
      fields.ghanaCard = { value: cardMatch[1].toUpperCase(), confidence: 90 };
    }

    // ── Occupation / Profession ──
    const occMatch = clean.match(/(?:occupation|profession|work|employer|business)[:\s]+([A-Za-z ]{3,40}?)(?:\.|,|\n)/i);
    if (occMatch) {
      fields.occupation = { value: this._titleCase(occMatch[1]), confidence: 70 };
    }

    // ── Guarantor name ──
    const gNamePatterns = [
      /(?:guarantor(?:'s)?\s+name|name\s+of\s+guarantor)[:\s]+([A-Za-z ]{4,45})/i,
      /guarantor[:\s]+([A-Za-z ]{4,45}?)(?:\s+of|\s+phone|\s+tel|\s+addr|,|\n)/i,
    ];
    for (const p of gNamePatterns) {
      const m = clean.match(p);
      if (m) {
        fields.guarantorName = { value: this._titleCase(m[1]), confidence: 80 };
        break;
      }
    }

    // ── Guarantor phone — look after guarantor name ──
    const gPhoneArea = clean.replace(/.*?guarantor/i, '').slice(0, 200);
    const gPhone = gPhoneArea.match(/(?:\+233|0)(?:[235789]\d)[\s-]?\d{3}[\s-]?\d{4}/);
    if (gPhone && gPhone[0] !== fields.phone.value) {
      fields.guarantorPhone = { value: gPhone[0].replace(/[\s-]/g, ''), confidence: 80 };
    }

    // ── Witness name ──
    const wMatch = clean.match(/(?:witness(?:'s)?\s+name|name\s+of\s+witness)[:\s]+([A-Za-z ]{4,45})/i)
      || clean.match(/witness[:\s]+([A-Za-z ]{4,45}?)(?:\s+of|\s+phone|\s+tel|,|\n)/i);
    if (wMatch) {
      fields.witnessName = { value: this._titleCase(wMatch[1]), confidence: 80 };
    }

    // ── Date — various formats ──
    const dateMatch = clean.match(/(?:date|dated|issued)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      || clean.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      try {
        const parts = dateMatch[1].split(/[\/\-]/);
        if (parts.length === 3) {
          const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          const m = parts[1].padStart(2, '0');
          const d = parts[0].padStart(2, '0');
          const parsed = new Date(`${y}-${m}-${d}`);
          if (!isNaN(parsed.getTime())) {
            fields.date = { value: `${y}-${m}-${d}`, confidence: 85 };
          }
        }
      } catch(e) {}
    }

    // ── Raw text for notes ──
    if (rawText.trim().length > 30) {
      fields.notes = {
        value: `[Scanned document]\n${rawText.slice(0, 600).trim()}`,
        confidence: 100
      };
    }

    return fields;
  },

  // ─── Populate the form ─────────────────────
  _populateForm(fields) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val;
    };
    set('scan-name',            fields.name.value);
    set('scan-phone',           fields.phone.value);
    set('scan-amount',          fields.amount.value);
    set('scan-months',          fields.months.value);
    set('scan-address',         fields.address.value);
    set('scan-ghana-card',      fields.ghanaCard.value);
    set('scan-occupation',      fields.occupation.value);
    set('scan-guarantor-name',  fields.guarantorName.value);
    set('scan-guarantor-phone', fields.guarantorPhone.value);
    set('scan-witness-name',    fields.witnessName.value);
    set('scan-notes',           fields.notes.value);
    if (fields.date.value) {
      set('scan-date', fields.date.value);
    }
  },

  // ─── Confidence report ─────────────────────
  _showConfidenceReport(fields, validation, ocrConf, statusEl) {
    const found   = Object.values(fields).filter(f => f.value && f.confidence > 0).length;
    const total   = Object.keys(fields).length - 1; // exclude notes
    const quality = found >= 5 ? 'good' : found >= 3 ? 'fair' : 'poor';
    const colours = { good: 'var(--green)', fair: 'var(--yellow)', poor: 'var(--red)' };
    const labels  = { good: '✅ Good scan', fair: '⚠️ Fair scan', poor: '📝 Low quality' };

    const keyFields = [
      { key: 'name',     label: 'Borrower Name' },
      { key: 'phone',    label: 'Phone Number' },
      { key: 'amount',   label: 'Loan Amount' },
      { key: 'months',   label: 'Duration' },
      { key: 'ghanaCard',label: 'Ghana Card' },
    ];

    const chips = keyFields.map(f => {
      const ok = !!fields[f.key].value;
      return `<span style="
        display:inline-flex;align-items:center;gap:4px;
        background:${ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)'};
        border:1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};
        color:${ok ? 'var(--green)' : 'var(--red)'};
        border-radius:20px;padding:2px 10px;font-size:11px;
      ">${ok ? '✓' : '✗'} ${f.label}</span>`;
    }).join('');

    statusEl.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="color:${colours[quality]};font-weight:600;font-size:13px">
            ${labels[quality]} — ${found} of ${total} fields detected
          </span>
          <span style="color:var(--text2);font-size:11px">
            OCR accuracy: ${Math.round(ocrConf || 0)}%
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${chips}</div>
        <div style="color:var(--text2);font-size:11px;margin-top:8px">
          Review highlighted fields below — correct anything that looks wrong before saving
        </div>
      </div>`;

    // Highlight unfilled fields
    keyFields.forEach(f => {
      if (!fields[f.key].value) {
        const formFieldIds = {
          name: 'scan-name', phone: 'scan-phone', amount: 'scan-amount',
          months: 'scan-months', ghanaCard: 'scan-ghana-card'
        };
        const el = document.getElementById(formFieldIds[f.key]);
        if (el) {
          el.style.borderColor = 'var(--yellow)';
          el.placeholder = '⚠️ Not found — enter manually';
        }
      }
    });

    // Re-enable submit button
    const submitBtn = document.getElementById('scan-submit-btn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  },

  // ─── Helpers ────────────────────────────────
  _titleCase(str) {
    return str.trim().replace(/\s+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  },

  _clean(str) {
    return str.trim().replace(/\s+/g, ' ');
  },

  // ─── Save scanned loan ──────────────────────
  async createLoanFromScan() {
    const name   = document.getElementById('scan-name').value.trim();
    const phone  = document.getElementById('scan-phone').value.trim();
    const amount = parseFloat(document.getElementById('scan-amount').value);
    const months = parseInt(document.getElementById('scan-months').value);

    if (!name)              { App.toast('Enter borrower name', 'error');     return; }
    if (!phone)             { App.toast('Enter phone number', 'error');      return; }
    if (!amount || amount <= 0) { App.toast('Enter a valid amount', 'error'); return; }
    if (!months)            { App.toast('Select loan duration', 'error');    return; }

    const c     = Calculator.calculate(amount, months);
    const start = document.getElementById('scan-date').value || App.today();
    const end   = Calculator.endDate(start, months);

    try {
      // Create borrower
      const { data: borrower, error: bErr } = await sb.from('borrowers').insert({
        agent_id    : App.agentId,
        full_name   : name,
        phone,
        address     : (document.getElementById('scan-address')?.value || '').trim(),
        occupation  : (document.getElementById('scan-occupation')?.value || '').trim(),
        ghana_card_number : (document.getElementById('scan-ghana-card')?.value || '').trim(),
        notes       : (document.getElementById('scan-notes')?.value || '').trim(),
      }).select('id').single();
      if (bErr) throw bErr;

      // Upload scanned image
      const img = document.getElementById('scan-preview-img');
      if (img.src && img.src.startsWith('data:')) {
        const blob = await (await fetch(img.src)).blob();
        const path = `${App.agentId}/${borrower.id}/scan.jpg`;
        await sb.storage.from('loan-docs').upload(path, blob, { upsert: true });
        const { data: { publicUrl } } = sb.storage.from('loan-docs').getPublicUrl(path);
        await sb.from('borrowers').update({ id_photo_url: publicUrl }).eq('id', borrower.id);
      }

      // Create loan
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
        notes           : (document.getElementById('scan-notes')?.value || '').trim(),
      }).select('id').single();
      if (lErr) throw lErr;

      // Add guarantor if present
      const gName  = document.getElementById('scan-guarantor-name')?.value.trim();
      const gPhone = document.getElementById('scan-guarantor-phone')?.value.trim();
      if (gName) {
        await sb.from('guarantors').insert({
          agent_id    : App.agentId,
          borrower_id : borrower.id,
          full_name   : gName,
          phone       : gPhone || '',
        }).select();
      }

      // Add witness if present
      const wName = document.getElementById('scan-witness-name')?.value.trim();
      if (wName) {
        await sb.from('witnesses').insert({
          agent_id    : App.agentId,
          borrower_id : borrower.id,
          full_name   : wName,
          phone       : '',
        }).select();
      }

      await sb.from('activity_log').insert({
        agent_id      : App.agentId,
        activity_type : 'LOAN_CREATED',
        description   : `Scanned loan of ${Calculator.fmt(amount)} issued to ${name} for ${months} months`,
        borrower_name : name,
        loan_id       : loan.id,
      });

      App.toast(`✅ Loan saved for ${name}!`, 'success');
      this.reset();
      App.navigate('loans');

    } catch(err) {
      App.toast(`Error: ${err.message}`, 'error', 5000);
    }
  },

  // ─── Reset scanner ──────────────────────────
  reset() {
    document.getElementById('scanner-upload-zone').style.display = 'block';
    document.getElementById('scanner-review').style.display      = 'none';
    ['scan-camera','scan-gallery'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const fields = ['scan-name','scan-phone','scan-amount','scan-address',
                    'scan-notes','scan-ghana-card','scan-occupation',
                    'scan-guarantor-name','scan-guarantor-phone','scan-witness-name'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.style.borderColor = ''; el.placeholder = ''; }
    });
    document.getElementById('scan-months').value = '3';
    document.getElementById('scan-date').value   = App.today();
    const banner = document.getElementById('scan-validation-banner');
    if (banner) banner.remove();
    const submitBtn = document.getElementById('scan-submit-btn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
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

    App.navigate('new-loan');
    setTimeout(() => {
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('b-name',       app.full_name);
      set('b-phone',      app.phone);
      set('b-address',    app.address);
      set('b-ghana-card', app.ghana_card_number);
      set('b-occupation', app.occupation);
      set('g-name',       app.guarantor_name);
      set('g-phone',      app.guarantor_phone);
      set('w-name',       app.witness_name);
      set('w-phone',      app.witness_phone);
      if (app.amount_requested) {
        set('l-amount', app.amount_requested);
        Loans.setAmount && Loans.setAmount(app.amount_requested);
      }
      if (app.duration_months) {
        set('l-months', app.duration_months);
        Loans.setMonths && Loans.setMonths(app.duration_months);
      }
      Loans.updateCalcPreview && Loans.updateCalcPreview();
    }, 200);

    await sb.from('enrollment_submissions').update({ status: 'Approved' }).eq('id', appId);
    App.toast('✅ Loaded into loan wizard — review and confirm', 'success', 4000);
  },

  async rejectApp(appId) {
    if (!confirm('Reject this application?')) return;
    await sb.from('enrollment_submissions').update({ status: 'Rejected' }).eq('id', appId);
    App.toast('Application rejected', 'info');
    this.loadApplications();
  },
};
