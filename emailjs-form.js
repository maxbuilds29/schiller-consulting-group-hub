/*
  Kontaktformular-Versand ueber EmailJS (kostenloser Free-Plan, siehe emailjs-config.js).
  Wird auf allen Seiten mit einem ".form-card"/".form-card-light"-Formular eingebunden.

  Ablauf pro Absenden:
  1. Eigene Validierung (native "required"-Felder) + Absenden-Button waehrend des Versands sperren.
  2. EIN EmailJS-Send an das Haupt-Template (interne Benachrichtigung an toEmail). Die automatische
     Dankes-Mail an den Kunden wird NICHT hier im Code ausgeloest, sondern laeuft ueber EmailJS'
     eingebautes "Auto-Reply"-Feature: im Dashboard wird am Haupt-Template unter dem Tab
     "Auto-Reply" die zweite Vorlage (Dankes-Mail) verlinkt — EmailJS verschickt dann bei jedem
     emailjs.send() automatisch beide Mails. Das ist robuster als zwei einzelne Sends im Code
     (kein Risiko einer fehlenden Dankes-Mail, falls der zweite Call haengen bleibt) und zaehlt
     ebenfalls als 2 Anfragen gegen das monatliche Kontingent.
  3. Erfolg/Fehler als Text direkt unter dem Formular anzeigen (kein Redirect, kein Alert-Popup).
*/
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var cfg = window.EMAILJS_CONFIG;
    var forms = document.querySelectorAll('form.form-card, form.form-card-light');
    if (!forms.length) return;

    if (typeof emailjs !== 'undefined' && cfg && cfg.publicKey && cfg.publicKey.indexOf('DEIN_') !== 0) {
      emailjs.init({ publicKey: cfg.publicKey });
    }

    forms.forEach(function (form) {
      // Statusfeld unterhalb des Buttons einfuegen (einmalig)
      var statusEl = form.querySelector('.form-status');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'form-status';
        statusEl.setAttribute('aria-live', 'polite');
        var submitBtnRef = form.querySelector('.form-submit');
        if (submitBtnRef && submitBtnRef.parentNode) {
          submitBtnRef.insertAdjacentElement('afterend', statusEl);
        } else {
          form.appendChild(statusEl);
        }
      }

      var submitBtn = form.querySelector('.form-submit');
      var submitBtnDefaultHTML = submitBtn ? submitBtn.innerHTML : '';
      var sourcePage = form.getAttribute('data-source') || document.title;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        var cfgNow = window.EMAILJS_CONFIG;
        var notConfigured = !cfgNow || !cfgNow.publicKey || cfgNow.publicKey.indexOf('DEIN_') === 0 ||
          !cfgNow.serviceId || cfgNow.serviceId.indexOf('DEIN_') === 0 ||
          !cfgNow.templateNotify || cfgNow.templateNotify.indexOf('DEIN_') === 0;

        if (notConfigured || typeof emailjs === 'undefined') {
          statusEl.textContent = 'Das Formular ist technisch fast fertig eingerichtet — es fehlen nur noch die EmailJS-Zugangsdaten in emailjs-config.js.';
          statusEl.className = 'form-status is-error';
          return;
        }

        var salutationEl = form.querySelector('[name="salutation"]');
        var firstNameEl = form.querySelector('[name="firstName"]');
        var lastNameEl = form.querySelector('[name="lastName"]');
        var emailEl = form.querySelector('[name="email"]');
        var phoneEl = form.querySelector('[name="phone"]');
        var messageEl = form.querySelector('[name="message"]');

        var customerEmail = emailEl ? emailEl.value.trim() : '';
        var firstName = firstNameEl ? firstNameEl.value.trim() : '';
        var lastName = lastNameEl ? lastNameEl.value.trim() : '';

        // Anrede fuer die Dankes-Mail: "Herr"/"Frau" nur, wenn im Formular ausgewaehlt
        // (optionales Feld, niemand wird zu einer Angabe gezwungen). Ohne Auswahl faellt
        // die Begruessung automatisch auf den vollen Namen zurueck ("Guten Tag Max Mayer") -
        // formeller als nur der Vorname, ohne dass wir das Geschlecht kennen muessen.
        var salutationRaw = salutationEl ? salutationEl.value : '';
        var salutationLabel = salutationRaw === 'Herr' ? 'Herr' : (salutationRaw === 'Frau' ? 'Frau' : 'Keine Angabe');
        var greeting = salutationRaw === 'Herr' ? ('Sehr geehrter Herr ' + lastName)
          : salutationRaw === 'Frau' ? ('Sehr geehrte Frau ' + lastName)
          : ('Guten Tag ' + firstName + ' ' + lastName);

        var params = {
          salutation: salutationLabel,
          greeting: greeting,
          first_name: firstName,
          last_name: lastName,
          customer_email: customerEmail,
          email: customerEmail, // Alias, falls die verlinkte Auto-Reply-Vorlage {{email}} statt {{customer_email}} erwartet
          phone: phoneEl ? phoneEl.value.trim() : '(nicht angegeben)',
          message: messageEl ? messageEl.value.trim() : '',
          source_page: sourcePage,
          to_email: cfgNow.toEmail,
          site_name: cfgNow.siteName || 'Schiller Consulting'
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Wird gesendet …';
        }
        statusEl.textContent = '';
        statusEl.className = 'form-status';

        emailjs.send(cfgNow.serviceId, cfgNow.templateNotify, params)
          .then(function () {
            statusEl.textContent = 'Vielen Dank! Ihre Anfrage ist angekommen — wir melden uns innerhalb von 24 Stunden.';
            statusEl.className = 'form-status is-success';
            form.reset();
          })
          .catch(function (err) {
            console.error('EmailJS Versand fehlgeschlagen:', err);
            statusEl.textContent = 'Leider ist beim Versand etwas schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt an info@schillerconsulting.de.';
            statusEl.className = 'form-status is-error';
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = submitBtnDefaultHTML;
            }
          });
      });
    });
  });
})();
