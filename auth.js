/**
 * DoubtHub galaxy authentication.
 * Handles landing CTAs, panel transitions, Supabase auth,
 * password visibility, and loading states.
 */

// ============================================
// 1. Supabase Client
// ============================================
(() => {
  if (window.location.protocol !== 'file:') return;

  const localUrl = `http://localhost:8000/auth.html${window.location.hash || ''}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 800);

  fetch(localUrl, {
    cache: 'no-store',
    mode: 'no-cors',
    signal: controller.signal,
  })
    .then(() => {
      window.clearTimeout(timeout);
      window.location.replace(localUrl);
    })
    .catch(() => {
      window.clearTimeout(timeout);
    });
})();

const SUPABASE_URL = 'https://fgdmxuslojnbyzeaweyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T0xMYGMk2MyqEeGw_3QPeg_jr2YfCJR';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data?.session) window.location.replace('index.html');
  });
}

// ============================================
// 2. DOM References
// ============================================
const authPage = document.body;
const focusLoginCta = document.getElementById('auth-focus-login');
const focusSignupCta = document.getElementById('auth-focus-signup');
const heroLoginCta = document.getElementById('auth-hero-login');
const heroSignupCta = document.getElementById('auth-hero-signup');

const emailView = document.getElementById('auth-email-view');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

const signinPanel = document.getElementById('auth-signin-panel');
const signupPanel = document.getElementById('auth-signup-panel');
const forgotPanel = document.getElementById('auth-forgot-panel');

const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const forgotForm = document.getElementById('forgot-form');

const signinError = document.getElementById('signin-error');
const signinSuccess = document.getElementById('signin-success');
const signupError = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');
const forgotError = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');

const goToSignup = document.getElementById('go-to-signup');
const goToSignin = document.getElementById('go-to-signin');
const goToForgot = document.getElementById('go-to-forgot');
const goToSigninFromForgot = document.getElementById('go-to-signin-from-forgot');
const fastAuthMedia = window.matchMedia('(max-width: 760px), (pointer: coarse)');

// ============================================
// 3. Landing CTA Focus
// ============================================
function focusField(selector) {
  const input = document.querySelector(selector);
  input?.focus({ preventScroll: true });
}

function openFastMobileAuth() {
  if (!fastAuthMedia.matches) return;
  authPage.classList.add('auth-fast-auth-open');
}

function activateSignin() {
  openFastMobileAuth();
  clearMessages();
  revealPanel(signinPanel);
  updateHeader('Sign In', 'Enter your credentials to continue');
  window.setTimeout(() => focusField('#signin-email'), fastAuthMedia.matches ? 320 : 120);
  if (window.lucide) lucide.createIcons();
}

function activateSignup() {
  openFastMobileAuth();
  clearMessages();
  revealPanel(signupPanel);
  updateHeader('Create Account', 'Start your DoubtHub orbit');
  window.setTimeout(() => focusField('#signup-name'), fastAuthMedia.matches ? 320 : 120);
  if (window.lucide) lucide.createIcons();
}

focusLoginCta?.addEventListener('click', activateSignin);
heroLoginCta?.addEventListener('click', activateSignin);
focusSignupCta?.addEventListener('click', activateSignup);
heroSignupCta?.addEventListener('click', activateSignup);

if (heroLoginCta && fastAuthMedia.matches) {
  heroLoginCta.addEventListener('click', () => {
    window.setTimeout(() => {
      const loaderState = document.documentElement.dataset.authDeviceLoader;
      const deviceReady = document.body.classList.contains('auth-device-ready');
      if (loaderState === 'error' || !deviceReady) {
        document.body.classList.add('auth-device-fallback');
      }
    }, 6500);
  });
}

// ============================================
// 4. View Transitions
// ============================================
function updateHeader(title, subtitle) {
  authTitle.style.opacity = '0';
  authSubtitle.style.opacity = '0';

  setTimeout(() => {
    authTitle.textContent = title;
    authSubtitle.textContent = subtitle;
    authTitle.style.opacity = '1';
    authSubtitle.style.opacity = '1';
  }, 180);
}

authTitle.style.transition = 'opacity 0.25s ease';
authSubtitle.style.transition = 'opacity 0.25s ease';

function revealPanel(panelToShow) {
  [signinPanel, signupPanel, forgotPanel].forEach((panel) => {
    panel.style.display = panel === panelToShow ? 'block' : 'none';
  });

  panelToShow.style.opacity = '0';
  panelToShow.style.transform = 'translateY(8px)';
  void panelToShow.offsetWidth;
  panelToShow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  panelToShow.style.opacity = '1';
  panelToShow.style.transform = 'translateY(0)';
}

goToSignup.addEventListener('click', () => {
  activateSignup();
});

goToSignin.addEventListener('click', () => {
  activateSignin();
});

goToForgot.addEventListener('click', () => {
  clearMessages();
  revealPanel(forgotPanel);
  updateHeader('Reset Password', 'We will send a reset link');
  if (window.lucide) lucide.createIcons();
});

goToSigninFromForgot.addEventListener('click', () => {
  goToSignin.click();
});

// ============================================
// 5. Utility Functions
// ============================================
function clearMessages() {
  [signinError, signinSuccess, signupError, signupSuccess, forgotError, forgotSuccess].forEach((el) => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

function showMsg(element, text) {
  element.textContent = text;
  element.style.display = 'block';
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = 'msgFadeIn 0.35s ease forwards';
}

function setLoading(btn, isLoading, loadingText = 'Please wait...') {
  if (isLoading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="auth-spinner"></span> ${loadingText}`;
    btn.disabled = true;
    btn.style.opacity = '0.72';
    btn.style.pointerEvents = 'none';
    return;
  }

  btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.pointerEvents = '';
  if (window.lucide) lucide.createIcons();
}

function requireAuthService(errorEl) {
  if (supabaseClient) return true;
  showMsg(errorEl, 'Authentication service is still loading. Please try again in a moment.');
  return false;
}

function getSupabaseName(user) {
  const metadata = user?.user_metadata || user?.app_metadata || {};
  return metadata.full_name || metadata.name || metadata.display_name || '';
}

async function saveAuthProfile(user, fullName, email) {
  if (!supabaseClient || !user?.id) return;

  const { error } = await supabaseClient
    .from('auth_profiles')
    .upsert({
      id: user.id,
      full_name: fullName || getSupabaseName(user) || email.split('@')[0],
      email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) console.warn('Unable to save auth profile table row:', error.message);
}

async function loadAuthProfileName(user, email) {
  const metadataName = getSupabaseName(user);
  if (metadataName) return metadataName;
  if (!supabaseClient || !user?.id) return '';

  const { data, error } = await supabaseClient
    .from('auth_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Unable to load auth profile table row:', error.message);
    return '';
  }
  return data?.full_name || email.split('@')[0] || '';
}

// ============================================
// 6. Password Visibility Toggles
// ============================================
document.querySelectorAll('.auth-eye-btn').forEach((toggleBtn) => {
  toggleBtn.addEventListener('click', () => {
    const input = toggleBtn.closest('.auth-input-wrap').querySelector('input');
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
      if (window.lucide) lucide.createIcons();
    }
  });
});

document.querySelectorAll('.auth-input').forEach((input) => {
  input.addEventListener('input', () => {
    input.classList.toggle('has-ink', input.value.length > 0);
    input.classList.add('ink-writing');
    window.clearTimeout(input.inkTimer);
    input.inkTimer = window.setTimeout(() => {
      input.classList.remove('ink-writing');
    }, 180);
  });
});

// ============================================
// 7. Sign Up Handler
// ============================================
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  if (!requireAuthService(signupError)) return;

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (password.length < 6) {
    showMsg(signupError, 'Password must be at least 6 characters.');
    return;
  }

  const btn = signupForm.querySelector('button[type="submit"]');
  setLoading(btn, true, 'Creating account...');

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth.html`,
        data: {
          full_name: name,
          name,
        }
      }
    });

    if (error) throw error;
    await saveAuthProfile(data?.user, name, email);

    showMsg(signupSuccess, 'Account created. You can sign in now.');
    signupForm.reset();
  } catch (error) {
    showMsg(signupError, error.message);
  } finally {
    setLoading(btn, false);
  }
});

// ============================================
// 8. Sign In Handler
// ============================================
signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  if (!requireAuthService(signinError)) return;

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  const btn = signinForm.querySelector('button[type="submit"]');
  setLoading(btn, true, 'Signing in...');

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const profileName = await loadAuthProfileName(data?.user, email);
    if (profileName) localStorage.setItem('doubthubUserName', profileName);

    showMsg(signinSuccess, 'Welcome back. Redirecting...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (error) {
    showMsg(signinError, error.message);
  } finally {
    setLoading(btn, false);
  }
});

// ============================================
// 9. Forgot Password Handler
// ============================================
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  if (!requireAuthService(forgotError)) return;

  const email = document.getElementById('forgot-email').value.trim();
  const btn = forgotForm.querySelector('button[type="submit"]');
  setLoading(btn, true, 'Sending link...');

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/index.html`
    });

    if (error) throw error;

    showMsg(forgotSuccess, 'Password reset link sent. Check your inbox.');
    forgotForm.reset();
  } catch (error) {
    showMsg(forgotError, error.message);
  } finally {
    setLoading(btn, false);
  }
});

// ============================================
// 10. Initialize
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  emailView?.classList.add('auth-view-active');
  authPage.classList.add('auth-galaxy-ready');
});
