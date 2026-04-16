// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Payments Module
// ══════════════════════════════════════════════

const Payments = {

  async record(loanId) {
    const btn       = document.querySelector('#record-payment-card .btn-success');
    const amountStr = document.getElementById('pay-amount').value;
    const dateStr   = document.getElementById('pay-date').value;
    const isLate    = document.getElementById('pay-late').checked;

    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) { App.toast('Please enter a valid amount', 'error'); return; }
    if (!dateStr)                { App.toast('Please select payment date', 'error'); return; }

    // Load current loan
    const { data: loan, error: lErr } = await sb.from('loans')
      .select('*, payments(count)').eq('id', loanId).single();
    if (lErr || !loan) { App.toast('Loan not found', 'error'); return; }

    const prevPayments = await sb.from('payments').select('id').eq('loan_id', loanId);
    const monthNumber  = (prevPayments.data?.length || 0) + 1;
    const penalty      = isLate ? loan.monthly_payment * LOAN_CONFIG.LATE_PENALTY_RATE : 0;
    const totalPaid    = amount + penalty;
    const newAmountPaid= loan.amount_paid + totalPaid;

    // Determine new status
    const tolerance = 1; // GHS 1 tolerance for rounding
    const newStatus = newAmountPaid >= (loan.total_repayable - tolerance)
      ? 'Completed' : loan.status;

    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;

    try {
      // Insert payment record
      await sb.from('payments').insert({
        agent_id      : App.agentId,
        loan_id       : loanId,
        amount_paid   : amount,
        penalty_amount: penalty,
        payment_date  : dateStr,
        month_number  : monthNumber,
        is_late       : isLate,
      });

      // Update loan amount_paid + status
      await sb.from('loans').update({
        amount_paid : newAmountPaid,
        status      : newStatus,
      }).eq('id', loanId);

      // Log
      const borrowerName = loan.borrowers?.full_name || '';
      await sb.from('activity_log').insert({
        agent_id      : App.agentId,
        activity_type : newStatus === 'Completed' ? 'LOAN_COMPLETED' : 'PAYMENT_RECORDED',
        description   : `Payment of ${Calculator.fmt(amount)}${isLate ? ` + penalty ${Calculator.fmt(penalty)}` : ''} recorded for month ${monthNumber}`,
        borrower_name : borrowerName,
        loan_id       : loanId,
      });

      if (newStatus === 'Completed') {
        App.toast('🎉 Loan fully repaid! Congratulations!', 'success', 5000);
      } else {
        App.toast(`✅ Payment recorded — Month ${monthNumber}`, 'success');
      }

      // Reload the detail screen
      Loans.loadDetail(loanId);

    } catch(err) {
      App.toast(`Error: ${err.message}`, 'error');
      btn.innerHTML = '✅ Record Payment';
      btn.disabled  = false;
    }
  },

  // Returns loans with payments due within the next N days
  async getUpcoming(days = 7) {
    const { data: loans } = await sb.from('loans')
      .select('*, borrowers(full_name), payments(id)')
      .eq('agent_id', App.agentId)
      .in('status', ['Active', 'Overdue']);

    if (!loans) return [];
    const upcoming = [];
    for (const loan of loans) {
      const monthsPaid = loan.payments?.length || 0;
      const daysLeft   = Calculator.daysUntilDue(loan.start_date, monthsPaid, loan.duration_months);
      if (daysLeft !== null && daysLeft <= days) {
        upcoming.push({ ...loan, daysLeft, monthsPaid });
      }
    }
    return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
  },
};
