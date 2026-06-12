(function () {
  'use strict';

  function buildUrl(path) {
    if (typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!path.startsWith('/')) path = '/' + path;
    return window.location.origin + path;
  }

  async function parseJsonResponse(response) {
    const text = await response.text().catch(() => '');
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      const error = new Error('Respuesta no JSON recibida');
      error.responseText = text;
      throw error;
    }
  }

  async function handleResponse(response) {
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      const message = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${response.status}`;
      const error = new Error(message);
      error.response = response;
      error.data = data;
      throw error;
    }
    return data;
  }

  window.__currentUser = null;

  window.apiFetch = async function (path, options = {}) {
    const url = buildUrl(path);
    const defaultOptions = {
      credentials: 'include'
    };

    const mergedOptions = Object.assign({}, defaultOptions, options);

    if (mergedOptions.body && !(mergedOptions.body instanceof FormData) && !mergedOptions.headers) {
      mergedOptions.headers = { 'Content-Type': 'application/json' };
    }

    if (mergedOptions.headers && !(mergedOptions.headers instanceof Headers)) {
      mergedOptions.headers = Object.assign({}, mergedOptions.headers);
    }

    return fetch(url, mergedOptions);
  };

  window.getSession = async function () {
    const response = await window.apiFetch('/api/session');
    const data = await handleResponse(response);
    console.log('getSession -> /api/session data:', data);
    window.__currentUser = data && data.user ? data.user : null;
    return data;
  };

  window.getProfile = async function () {
    const response = await window.apiFetch('/api/profile');
    const data = await handleResponse(response);
    window.__currentUser = data && data.user ? data.user : null;
    return data;
  };

  window.setCurrentUser = function (user) {
    window.__currentUser = user || null;
    return window.__currentUser;
  };

  window.isAuthenticated = function () {
    return !!window.__currentUser;
  };

  window.__logoutInProgress = false;

  window.logout = async function (event) {
    if (window.__logoutInProgress) {
      return;
    }
    window.__logoutInProgress = true;

    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    try {
      const response = await window.apiFetch('/api/logout', { method: 'POST' });
      if (!response.ok) {
        console.warn('Logout failed with status', response.status);
      }
    } catch (error) {
      console.warn('Error during logout:', error);
    }

    window.__currentUser = null;
    if (typeof window.clearLocalSession === 'function') {
      try { window.clearLocalSession(); } catch (ignore) {}
    }
    window.location.href = 'login.html';
  };

  window.authClient = {
    apiFetch: window.apiFetch,
    getSession: window.getSession,
    getProfile: window.getProfile,
    logout: window.logout,
    setCurrentUser: window.setCurrentUser,
    isAuthenticated: window.isAuthenticated
  };

  window.sessionSyncPromise = window.getSession().catch((error) => {
    console.warn('No se pudo sincronizar la sesión:', error);
    window.__currentUser = null;
    return { user: null };
  });
})();
