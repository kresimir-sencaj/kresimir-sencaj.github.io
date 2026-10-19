/*
 * Spam-safe contact. The address never appears in the HTML, the page data or as a mail link:
 * it is stored as shifted character codes and only assembled after a visitor solves a small sum.
 *   - [data-email-guard] (Contact page headline): click -> sum -> the address is shown;
 *     clicking the address opens the visitor's email app.
 *   - window.emailGuard.compose({ name, email, message }) is used by the contact form: sum ->
 *     the email app opens with the message filled in. Rejects with { message: '' } if cancelled.
 */
(function () {
  var K = [110, 124, 105, 126, 110, 121, 111, 127, 53, 129, 109, 125, 108, 100, 116, 68, 114, 114, 109, 111, 121, 53, 113, 119, 124];
  var unlocked = false;

  function addr() { return K.map(function (c, i) { return String.fromCharCode(c - ((i * 7) % 13) - 3); }).join(''); }
  function open(subject, body) {
    var q = [];
    if (subject) q.push('subject=' + encodeURIComponent(subject));
    if (body) q.push('body=' + encodeURIComponent(body));
    window.location.href = 'mai' + 'lto:' + addr() + (q.length ? '?' + q.join('&') : '');
  }

  function challenge() {
    if (unlocked) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
      var wrap = document.createElement('div');
      wrap.className = 'email-guard';
      wrap.innerHTML =
        '<form class="email-guard__box" role="dialog" aria-modal="true" aria-labelledby="eg-title">' +
        '<p class="email-guard__title" id="eg-title">Quick check</p>' +
        '<label class="email-guard__label" for="eg-input">What is ' + a + ' + ' + b + '?</label>' +
        '<input class="email-guard__input" id="eg-input" inputmode="numeric" autocomplete="off" required>' +
        '<p class="email-guard__error" aria-live="polite"></p>' +
        '<div class="email-guard__actions"><button type="button" class="email-guard__btn email-guard__btn--ghost">Cancel</button>' +
        '<button type="submit" class="email-guard__btn">Continue</button></div></form>';
      var back = document.activeElement;
      document.body.appendChild(wrap);
      var form = wrap.querySelector('form'), input = wrap.querySelector('input'), err = wrap.querySelector('.email-guard__error');
      function close() { document.removeEventListener('keydown', esc); wrap.remove(); if (back && back.focus) back.focus(); }
      function esc(e) {
        if (e.key === 'Escape') { close(); reject({ message: '' }); return; }
        if (e.key !== 'Tab') return;
        // keep keyboard focus inside the dialog
        var f = wrap.querySelectorAll('input, button'), a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
      document.addEventListener('keydown', esc);
      wrap.querySelector('.email-guard__btn--ghost').onclick = function () { close(); reject({ message: '' }); };
      wrap.onclick = function (e) { if (e.target === wrap) { close(); reject({ message: '' }); } };
      form.onsubmit = function (e) {
        e.preventDefault();
        if (parseInt(input.value, 10) === a + b) { unlocked = true; close(); resolve(); }
        else { err.textContent = 'Not quite, try again.'; input.select(); }
      };
      setTimeout(function () { input.focus(); }, 30);
    });
  }

  window.emailGuard = {
    compose: function (f) {
      return challenge().then(function () {
        var body = (f.message || '') + '\n\n' + (f.name || '') + (f.email ? ' (' + f.email + ')' : '');
        open('Project enquiry' + (f.name ? ' from ' + f.name : ''), body);
      });
    }
  };

  // headline link on the Contact page (re-bound after client-side navigation)
  function bind() {
    var els = document.querySelectorAll('[data-email-guard]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        if (el.__emailGuard) return;   // a property, not an attribute: saved HTML may already carry old markers
        el.__emailGuard = true;
        el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        function act() {
          if (el.getAttribute('data-revealed') !== null) { open(); return; }
          challenge().then(function () { el.textContent = addr(); el.setAttribute('data-revealed', ''); }, function () {});
        }
        el.addEventListener('click', act);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      })(els[i]);
    }
  }
  function start() { bind(); new MutationObserver(function () { clearTimeout(start.t); start.t = setTimeout(bind, 200); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'complete') setTimeout(start, 300); else window.addEventListener('load', function () { setTimeout(start, 300); });
})();
