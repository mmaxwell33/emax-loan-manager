// ══════════════════════════════════════════════
// E-MAX LOAN MANAGER — Auth Module
// ══════════════════════════════════════════════

const Auth = {

  async login() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl    = document.getElementById('auth-error');
    const btn      = document.getElementById('btn-login');

    errEl.style.display = 'none';
    if (!email || !password) { return this._showError('Please enter email and password.'); }

    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;

    const { error } = await sb.auth.signInWithPassword({ email, password });

    btn.innerHTML = 'Sign In';
    btn.disabled  = false;

    if (error) this._showError(error.message);
  },

  async signup() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name     = document.getElementById('auth-name').value.trim();
    const btn      = document.getElementById('btn-signup');

    if (!email || !password || !name) { return this._showError('Please fill in all fields.'); }
    if (password.length < 6)          { return this._showError('Password must be at least 6 characters.'); }

    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;

    const { error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    });

    btn.innerHTML = 'Create Account';
    btn.disabled  = false;

    if (error) return this._showError(error.message);
    App.toast('Account created! Check your email to confirm.', 'success', 5000);
  },

  async logout() {
    await sb.auth.signOut();
    App.toast('Signed out.', 'info');
  },

  showSignup() {
    document.getElementById('signup-section').style.display = 'block';
    document.getElementById('btn-login').style.display = 'none';
    document.querySelector('.auth-sub').textContent = 'Create your account';
  },

  _showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  },
};
