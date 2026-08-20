(function () {
  'use strict';

  const d = document;
  let currentEventId = null;
  let patchTimer = null;
  let patchGeneration = 0;
  let apiWrapped = false;

  const $ = id => d.getElementById(id);
  const n = value => {
    const parsed = Number(String(value == null ? '' : value).replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const money = value => '€' + n(value).toFixed(2).replace('.00', '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));

  function client() {
    return window.FilitaliaAuth && window.FilitaliaAuth.client;
  }

  function setText(id, value) {
    const node = $(id);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function schedulePatch(delay) {
    if (!currentEventId) return;
    window.clearTimeout(patchTimer);
    patchTimer = window.setTimeout(function () {
      patchEventLedger(currentEventId);
    }, delay == null ? 120 : delay);
  }

  async function patchEventLedger(eventId) {
    const c = client();
    const modal = $('eventFinanceModal');
    if (!c || !modal || !modal.classList.contains('show') || !eventId) return;
    if (($('efTitle') && $('efTitle').textContent || '').indexOf('Budget richiesta') === 0) return;

    const generation = ++patchGeneration;
    const [ledgerRes, entriesRes] = await Promise.all([
      c.rpc('event_finance_player_ledger', { target_event_id: eventId }),
      c.from('event_finance_items')
        .select('kind,budget_amount,actual_amount,status')
        .eq('event_id', eventId)
    ]);

    if (generation !== patchGeneration || currentEventId !== eventId) return;
    if (ledgerRes.error) {
      console.warn('Event finance player ledger unavailable', ledgerRes.error);
      return;
    }
    if (entriesRes.error) {
      console.warn('Event finance entries unavailable', entriesRes.error);
      return;
    }

    const ledger = ledgerRes.data || [];
    const entries = (entriesRes.data || []).filter(item => item.status !== 'cancelled');

    let manualBudgetIncome = 0;
    let manualActualIncome = 0;
    let budgetExpense = 0;
    let actualExpense = 0;
    entries.forEach(item => {
      if (item.kind === 'income') {
        manualBudgetIncome += n(item.budget_amount);
        manualActualIncome += n(item.actual_amount);
      } else {
        budgetExpense += n(item.budget_amount);
        actualExpense += n(item.actual_amount);
      }
    });

    const playerDue = ledger.reduce((sum, row) => sum + n(row.due_amount), 0);
    const playerReceived = ledger.reduce((sum, row) => sum + n(row.received_amount), 0);
    const playerOutstanding = ledger.reduce((sum, row) => sum + n(row.outstanding_amount), 0);
    const expectedIncome = manualBudgetIncome + playerDue;
    const actualIncome = manualActualIncome + playerReceived;
    const balance = actualIncome - actualExpense;

    setText('efExpectedIncome', money(expectedIncome));
    setText('efActualIncome', money(actualIncome));
    setText('efOutstanding', money(playerOutstanding));
    setText('efExpectedExpense', money(budgetExpense));
    setText('efActualExpense', money(actualExpense));
    setText('efBalance', money(balance));

    const balanceNode = $('efBalance');
    if (balanceNode && balanceNode.parentElement) {
      balanceNode.parentElement.classList.toggle('bad', balance < 0);
      balanceNode.parentElement.classList.toggle('good', balance >= 0);
    }

    const tbody = $('efPlayers');
    if (tbody) {
      const html = ledger.length ? ledger.map(row => {
        const status = String(row.payment_status || 'pending');
        const pill = status === 'paid' ? '' : status === 'waived' || status === 'not_required' ? '' : 'warn';
        return '<tr>' +
          '<td><strong>' + esc(row.participant_name || 'Giocatore') + '</strong></td>' +
          '<td><span class="ef-pill ' + pill + '">' + esc(status) + '</span></td>' +
          '<td>' + money(row.due_amount) + '</td>' +
          '<td>' + money(row.received_amount) + '</td>' +
          '<td>' + money(row.outstanding_amount) + '</td>' +
        '</tr>';
      }).join('') : '<tr><td colspan="5" class="ef-muted">Nessuna registrazione collegata a questo evento.</td></tr>';
      if (tbody.innerHTML !== html) tbody.innerHTML = html;
    }
  }

  function eventIdFromFinanceButton(button) {
    const card = button && button.closest('.event-admin-card');
    const edit = card && card.querySelector('.event-edit-v3');
    return edit && edit.dataset ? edit.dataset.id : null;
  }

  d.addEventListener('click', function (event) {
    const financeButton = event.target.closest && event.target.closest('.event-finance-v1');
    if (financeButton) {
      currentEventId = eventIdFromFinanceButton(financeButton);
      schedulePatch(180);
      window.setTimeout(schedulePatch, 650, 0);
      return;
    }

    const requestEventButton = event.target.closest && event.target.closest('.er-eventfinance');
    if (requestEventButton) {
      currentEventId = requestEventButton.dataset.event || null;
      schedulePatch(180);
      window.setTimeout(schedulePatch, 650, 0);
      return;
    }

    if (event.target.closest && event.target.closest('.er-budget,#erSave')) {
      currentEventId = null;
      return;
    }

    if (event.target.closest && event.target.closest('#efSave,.ef-delete')) {
      schedulePatch(300);
      window.setTimeout(schedulePatch, 900, 0);
    }
  }, true);

  function wrapPublicApi() {
    if (apiWrapped || !window.FilitaliaEventFinance) return false;
    const original = window.FilitaliaEventFinance;
    if (!original.openEvent || !original.openRequests || !original.newRequest) return false;
    window.FilitaliaEventFinance = Object.freeze({
      openEvent: function (eventId) {
        currentEventId = eventId;
        const result = original.openEvent(eventId);
        schedulePatch(180);
        window.setTimeout(schedulePatch, 650, 0);
        return result;
      },
      openRequests: function () {
        currentEventId = null;
        return original.openRequests();
      },
      newRequest: function () {
        currentEventId = null;
        return original.newRequest();
      }
    });
    apiWrapped = true;
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (wrapPublicApi() || attempts > 100) window.clearInterval(timer);
  }, 100);
})();
