// Authentication helper functions and login form handling
const BACKEND_ORIGIN = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://localhost:3000';
const LOGIN_URL = `${BACKEND_ORIGIN}/login`;
const AUTH_TOKEN_KEY = 'flashcardAuthToken';
const AUTH_USER_KEY = 'flashcardAuthUser';

const authSection = document.getElementById('authSection');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

// Get the auth token from sessionStorage
function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

// Get the authenticated username from sessionStorage
function getAuthUser() {
  return sessionStorage.getItem(AUTH_USER_KEY);
}

// Return true when the user is currently authenticated
function isAuthenticated() {
  return Boolean(getAuthToken() && getAuthUser());
}

// Show the login page and hide the app UI
function showLogin() {
  authSection.classList.remove('hidden');
  document.getElementById('addFlashcardSection').classList.add('hidden');
  document.getElementById('flashcardForm').classList.add('hidden');
  document.getElementById('flashcards').classList.add('hidden');
  logoutBtn.classList.add('hidden');
  welcomeMessage.classList.add('hidden');
}

function clearLoginFields() {
  loginUsername.value = '';
  loginPassword.value = '';
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

// Show the flashcard app UI and hide the login form
function showApp() {
  authSection.classList.add('hidden');
  document.getElementById('addFlashcardSection').classList.remove('hidden');
  document.getElementById('flashcardForm').classList.remove('hidden');
  document.getElementById('flashcards').classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  welcomeMessage.classList.remove('hidden');
}

// Update the auth UI based on whether a token is available
function updateAuthUI() {
  if (isAuthenticated()) {
    showApp();
    welcomeMessage.textContent = `Logged in as ${getAuthUser()}`;
  } else {
    clearLoginFields();
    showLogin();
    loginUsername.focus();
  }
}

// Authenticated fetch helper that attaches the bearer token header
async function authFetch(url, options = {}) {
  options.headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, options);
  if (response.status === 401) {
    logout('Session expired. Please login again.');
  }
  return response;
}

// Logout the user locally by clearing session storage and updating the UI
function logout(message) {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  updateAuthUI();

  if (message) {
    showToast(message);
  }
}

// Handle login form submission and store the JWT token on success
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  loginError.classList.add('hidden');

  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Username and password are required.';
    loginError.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      loginError.textContent = data.error || 'Invalid username or password.';
      loginError.classList.remove('hidden');
      return;
    }

    sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
    sessionStorage.setItem(AUTH_USER_KEY, data.user);
    updateAuthUI();
    if (typeof loadGroups === 'function') {
      loadGroups();
      loadFlashcards();
    }
  } catch (error) {
    loginError.textContent = 'Server connection error.';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => logout());

// Export auth helpers to the global scope so app.js can use them
window.authFetch = authFetch;
window.isAuthenticated = isAuthenticated;
window.updateAuthUI = updateAuthUI;
window.logout = logout;

updateAuthUI();

if (isAuthenticated() && typeof loadGroups === 'function') {
  loadGroups();
  loadFlashcards();
}
