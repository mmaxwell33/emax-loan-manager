// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Calculator Engine
// Business Rules: 4% processing fee, 10%/month interest
// ══════════════════════════════════════════════

const Calculator = {

  calculate(principal, durationMonths) {
    const p = parseFloat(principal);
    const m = parseInt(durationMonths);
    if (!p || p <= 0 || !m || m < 1 || m > 12) return null;

    const processingFee    = p * LOAN_CONFIG.PROCESSING_FEE_RATE;    // 4%
    const monthlyInterest  = p * LOAN_CONFIG.MONTHLY_INTEREST_RATE;  // 10%
    const totalInterest    = monthlyInterest * m;
    const totalRepayable   = p + totalInterest;
    const monthlyPayment   = totalRepayable / m;
    const latePenalty      = monthlyPayment * LOAN_CONFIG.LATE_PENALTY_RATE; // 10%

    return {
      principal,
      processingFee   : +processingFee.toFixed(2),
      monthlyInterest : +monthlyInterest.toFixed(2),
      totalInterest   : +totalInterest.toFixed(2),
      totalRepayable  : +totalRepayable.toFixed(2),
      monthlyPayment  : +monthlyPayment.toFixed(2),
      latePenalty     : +latePenalty.toFixed(2),
      durationMonths  : m,
    };
  },

  // Format as GH₵ 1,000.00
  fmt(amount) {
    const n = parseFloat(amount) || 0;
    return `GH₵ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },

  // Format compact: GH₵ 1.2k
  fmtShort(amount) {
    const n = parseFloat(amount) || 0;
    if (n >= 1000000) return `GH₵ ${(n/1000000).toFixed(1)}M`;
    if (n >= 1000)    return `GH₵ ${(n/1000).toFixed(1)}k`;
    return this.fmt(n);
  },

  // End date given start date + months
  endDate(startDateStr, months) {
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + parseInt(months));
    return d.toISOString().split('T')[0];
  },

  // Days until next payment (given start date, which month we're on, and duration)
  daysUntilDue(startDateStr, monthsPaid, totalMonths) {
    if (monthsPaid >= totalMonths) return null; // completed
    const start = new Date(startDateStr);
    const nextDue = new Date(start);
    nextDue.setMonth(nextDue.getMonth() + monthsPaid + 1);
    const today = new Date();
    today.setHours(0,0,0,0);
    return Math.floor((nextDue - today) / (1000*60*60*24));
  },

  // Which month number is now due
  currentMonthDue(startDateStr) {
    const start = new Date(startDateStr);
    const today = new Date();
    const diffMonths = (today.getFullYear() - start.getFullYear()) * 12
                     + (today.getMonth()    - start.getMonth());
    return diffMonths + 1;
  },

  // Percentage paid
  paidPercent(amountPaid, totalRepayable) {
    if (!totalRepayable) return 0;
    return Math.min(100, Math.round((amountPaid / totalRepayable) * 100));
  },
};
