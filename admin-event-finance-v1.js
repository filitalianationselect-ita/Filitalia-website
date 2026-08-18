(function () {
  'use strict';

  const d = document;
  const $ = id => d.getElementById(id);
  const money = value => '€' + Number(value || 0).toFixed(2).replace('.00', '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const notify = message => window.showToast ? window.showToast(message) : window.alert(message);
  let profile = null;
  let financeScope = null;
  let editingFinanceId = null;

  function client() { return window.FilitaliaAuth && window.FilitaliaAuth.client; }
  function role() { return String(profile && (profile.actual_role || profile.role) || ''); }
  function isAdmin() { return ['admin','super_admin'].includes(role()); }
  function n(value) { const x = Number(String(value == null ? '' : value).replace(',','.')); return Number.isFinite(x) && x >= 0 ? x : 0; }
  function val(id) { return String($(id) && $(id).value || '').trim(); }

  function installStyle() {
    if ($('eventFinanceV1Style')) return;
    const style = d.createElement('style');
    style.id = 'eventFinanceV1Style';
    style.textContent = `
      .ef-modal{position:fixed;inset:0;z-index:460;background:rgba(4,25,18,.72);display:none;place-items:center;padding:16px}.ef-modal.show{display:grid}.ef-card{width:min(1180px,100%);max-height:95vh;overflow:auto;background:#f4f8f6;border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.3);border:1px solid #bdd5c8}.ef-head{position:sticky;top:0;z-index:3;background:linear-gradient(135deg,#0b3f2c,#17724f);color:#fff;padding:19px 22px;display:flex;justify-content:space-between;gap:14px}.ef-head h2{margin:0 0 4px}.ef-body{padding:20px}.ef-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:18px}.ef-stat{background:#fff;border:1px solid #cee0d7;border-radius:15px;padding:13px}.ef-stat span{display:block;font-size:11px;color:#6b7e74}.ef-stat strong{display:block;font-size:22px;margin-top:4px}.ef-stat.good strong{color:#117148}.ef-stat.bad strong{color:#a33b45}.ef-section{background:#fff;border:1px solid #d2e1d9;border-radius:18px;padding:16px;margin-top:14px}.ef-section h3{margin:0 0 4px}.ef-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ef-grid .full{grid-column:1/-1}.ef-grid label{font-size:11px;font-weight:800;color:#355b49}.ef-grid input,.ef-grid select,.ef-grid textarea{width:100%;margin-top:5px;padding:10px 11px;border:1px solid #c9dbd1;border-radius:10px;background:#fff;font:inherit}.ef-table{width:100%;border-collapse:collapse;min-width:760px}.ef-table th,.ef-table td{padding:9px;border-bottom:1px solid #e4ece8;text-align:left;font-size:12px}.ef-table th{color:#6b7e74;background:#f8fbf9}.ef-scroll{overflow:auto}.ef-list{display:grid;gap:8px}.ef-item{display:grid;grid-template-columns:1.5fr .7fr .7fr .8fr auto;gap:9px;align-items:center;border:1px solid #dbe7e1;border-radius:12px;padding:10px}.ef-item small{color:#718078}.ef-actions{display:flex;gap:7px;flex-wrap:wrap}.ef-request-card{border:1px solid #d4e2db;border-radius:15px;padding:13px;background:#fff}.ef-request-head{display:flex;justify-content:space-between;gap:10px}.ef-pill{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e8f2ed;color:#285e48;font-size:10px;font-weight:900}.ef-pill.warn{background:#fff2d8;color:#8a620e}.ef-pill.bad{background:#fae6e8;color:#963844}.ef-muted{color:#728178;font-size:12px}.ef-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.ef-finance-btn{margin-left:0}
      @media(max-width:900px){.ef-stats{grid-template-columns:repeat(2,1fr)}.ef-grid{grid-template-columns:1fr 1fr}.ef-item{grid-template-columns:1fr 1fr}.ef-item>div:first-child{grid-column:1/-1}}@media(max-width:620px){.ef-grid{grid-template-columns:1fr}.ef-grid .full{grid-column:auto}.ef-head{align-items:flex-start}.ef-card{border-radius:18px}.ef-body{padding:13px}.ef-item{grid-template-columns:1fr}}
    `;
    d.head.appendChild(style);
  }

  function buildUi() {
    if ($('eventFinanceModal')) return;
    d.body.insertAdjacentHTML('beforeend', `
      <div id="eventFinanceModal" class="ef-modal"><div class="ef-card">
        <div class="ef-head"><div><h2 id="efTitle">Finanze evento</h2><div id="efSub" class="ef-muted" style="color:#cfe3d8"></div></div><button id="efClose" class="btn secondary">Chiudi</button></div>
        <div class="ef-body">
          <div class="ef-stats">
            <div class="ef-stat"><span>Entrate previste</span><strong id="efExpectedIncome">€0</strong></div>
            <div class="ef-stat"><span>Entrate incassate</span><strong id="efActualIncome">€0</strong></div>
            <div class="ef-stat"><span>Da incassare giocatori</span><strong id="efOutstanding">€0</strong></div>
            <div class="ef-stat"><span>Uscite previste</span><strong id="efExpectedExpense">€0</strong></div>
            <div class="ef-stat"><span>Uscite reali</span><strong id="efActualExpense">€0</strong></div>
            <div class="ef-stat good"><span>Saldo reale</span><strong id="efBalance">€0</strong></div>
          </div>
          <div class="ef-section"><h3>Movimenti e costi</h3><div class="ef-muted">Budget e consuntivo. I pagamenti dei giocatori vengono letti automaticamente dalle registrazioni.</div><div id="efEntries" class="ef-list" style="margin-top:12px"></div></div>
          <div class="ef-section"><h3 id="efFormTitle">Aggiungi voce</h3><div class="ef-grid" style="margin-top:10px">
            <label>Tipo<select id="efKind"><option value="expense">Uscita</option><option value="income">Entrata</option></select></label>
            <label>Categoria<input id="efCategory" list="efCategories" placeholder="Palestra"><datalist id="efCategories"><option>Palestra</option><option>Fotografo / Video</option><option>Arbitri</option><option>Staff / Coach</option><option>Viaggio</option><option>Hotel</option><option>Trasporti</option><option>Magliette / Divise</option><option>Materiale</option><option>Medico / BLSD</option><option>Sponsor</option><option>Altra entrata</option><option>Altro</option></datalist></label>
            <label>Budget €<input id="efBudget" type="number" min="0" step="0.01"></label>
            <label>Reale €<input id="efActual" type="number" min="0" step="0.01"></label>
            <label class="full">Descrizione<input id="efDescription" placeholder="Affitto palestra 6 ore"></label>
            <label>Stato<select id="efStatus"><option value="planned">Previsto</option><option value="pending">Da pagare/incassare</option><option value="paid">Pagato</option><option value="received">Incassato</option><option value="cancelled">Annullato</option></select></label>
            <label>Fornitore / Sponsor<input id="efCounterparty"></label>
            <label>Metodo pagamento<input id="efMethod" placeholder="Bonifico"></label>
            <label>Ricevuta / fattura<input id="efReceipt" placeholder="Link o riferimento"></label>
            <label class="full">Note<textarea id="efNotes" rows="2"></textarea></label>
          </div><div class="ef-footer"><button id="efReset" class="btn secondary">Pulisci</button><button id="efSave" class="btn primary">Salva voce</button></div></div>
          <div id="efPlayersSection" class="ef-section"><h3>Pagamenti giocatori</h3><div class="ef-muted">Questa lista alimenta automaticamente le entrate dell'evento.</div><div class="ef-scroll" style="margin-top:10px"><table class="ef-table"><thead><tr><th>Giocatore</th><th>Stato</th><th>Dovuto</th><th>Incassato</th><th>Da incassare</th></tr></thead><tbody id="efPlayers"></tbody></table></div></div>
        </div>
      </div>
      <div id="eventRequestModal" class="ef-modal"><div class="ef-card" style="width:min(920px,100%)"><div class="ef-head"><div><h2>Richiesta nuovo evento</h2><div class="ef-muted" style="color:#cfe3d8">Inserisci proposta e costi previsti. Dopo il salvataggio potrai aggiungere altre voci.</div></div><button id="erClose" class="btn secondary">Chiudi</button></div><div class="ef-body"><div class="ef-grid">
        <label class="full">Nome evento<input id="erName" placeholder="Talent ID Messina"></label><label>Tipo<input id="erType" value="Camp / Talent ID"></label><label>Città<input id="erCity"></label><label>Data proposta<input id="erDate" type="date"></label><label>Ora inizio<input id="erStart" type="time"></label><label>Ora fine<input id="erEnd" type="time"></label><label class="full">Palestra / luogo<input id="erVenue"></label><label>Partecipanti previsti<input id="erParticipants" type="number" min="0"></label><label>Quota prevista €<input id="erFee" type="number" min="0" step="0.01"></label><label class="full">Note<textarea id="erNotes" rows="3"></textarea></label></div>
        <div class="ef-section"><h3>Costi previsti rapidi</h3><div class="ef-grid" style="margin-top:10px"><label>Palestra €<input class="er-cost" data-category="Palestra" type="number" min="0" step="0.01"></label><label>Foto / Video €<input class="er-cost" data-category="Fotografo / Video" type="number" min="0" step="0.01"></label><label>Arbitri €<input class="er-cost" data-category="Arbitri" type="number" min="0" step="0.01"></label><label>Staff / Coach €<input class="er-cost" data-category="Staff / Coach" type="number" min="0" step="0.01"></label><label>Viaggi €<input class="er-cost" data-category="Viaggio" type="number" min="0" step="0.01"></label><label>Hotel €<input class="er-cost" data-category="Hotel" type="number" min="0" step="0.01"></label><label>Magliette / Divise €<input class="er-cost" data-category="Magliette / Divise" type="number" min="0" step="0.01"></label><label>Materiale / BLSD €<input class="er-cost" data-category="Materiale / BLSD" type="number" min="0" step="0.01"></label></div></div>
        <div class="ef-footer"><button id="erSave" class="btn primary">Invia richiesta</button></div></div></div></div>
      <div id="eventRequestsListModal" class="ef-modal"><div class="ef-card" style="width:min(980px,100%)"><div class="ef-head"><div><h2>Richieste eventi</h2><div class="ef-muted" style="color:#cfe3d8">Preventivi, approvazioni e conversione in evento.</div></div><button id="erlClose" class="btn secondary">Chiudi</button></div><div class="ef-body"><div id="erList" class="ef-list"></div></div></div></div>
    `);
    $('efClose').onclick = () => $('eventFinanceModal').classList.remove('show');
    $('erClose').onclick = () => $('eventRequestModal').classList.remove('show');
    $('erlClose').onclick = () => $('eventRequestsListModal').classList.remove('show');
    $('efSave').onclick = saveFinanceItem;
    $('efReset').onclick = resetFinanceForm;
    $('erSave').onclick = saveRequest;
  }

  function addToolbarButtons() {
    const newButton = $('eventNewV3');
    if (!newButton || !newButton.parentElement) return;
    const actions = newButton.parentElement;
    if (!$('eventRequestNewV1')) {
      const b = d.createElement('button'); b.id = 'eventRequestNewV1'; b.className = 'btn secondary'; b.textContent = '＋ Richiedi evento'; b.onclick = openRequestForm; actions.insertBefore(b, newButton);
    }
    if (!$('eventRequestsV1')) {
      const b = d.createElement('button'); b.id = 'eventRequestsV1'; b.className = 'btn secondary'; b.textContent = 'Richieste eventi'; b.onclick = openRequestsList; actions.insertBefore(b, newButton);
    }
  }

  function addEventFinanceButtons() {
    d.querySelectorAll('.event-admin-card').forEach(card => {
      if (card.querySelector('.event-finance-v1')) return;
      const edit = card.querySelector('.event-edit-v3');
      const actions = card.querySelector('.event-admin-actions');
      if (!edit || !actions) return;
      const b = d.createElement('button'); b.className = 'btn secondary event-finance-v1'; b.textContent = 'Finanze'; b.onclick = () => openEventFinance(edit.dataset.id); actions.insertBefore(b, edit);
    });
  }

  function enhance() { addToolbarButtons(); addEventFinanceButtons(); }

  async function expectedPlayerAmount(row, eventId) {
    if (row.payment_amount != null && row.payment_amount !== '') return n(row.payment_amount);
    try {
      const raw = row.original_data || {};
      const category = raw.category || raw.Categoria || raw['Categoria'] || 'Open';
      const shirtSize = row.shirt_size || raw['Taglia Maglia'] || 'Nessuna';
      return n(window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.quote(eventId, { category, shirtSize }).amount);
    } catch (_) { return 0; }
  }

  async function readScopeData() {
    const c = client();
    if (!c || !financeScope) throw new Error('SUPABASE_NOT_CONFIGURED');
    let q = c.from('event_finance_items').select('*').order('created_at', { ascending: true });
    q = financeScope.type === 'event' ? q.eq('event_id', financeScope.id) : q.eq('request_id', financeScope.id);
    const entriesRes = await q;
    if (entriesRes.error) throw entriesRes.error;
    let players = [];
    if (financeScope.type === 'event') {
      const r = await c.from('registrations').select('id,participant_name,payment_status,payment_amount,payment_currency,shirt_size,original_data,registration_status').eq('camp_event_id', financeScope.id).order('participant_name');
      if (r.error) throw r.error;
      players = r.data || [];
      for (const row of players) row._expected = await expectedPlayerAmount(row, financeScope.id);
    }
    return { entries: entriesRes.data || [], players };
  }

  function renderFinance(data) {
    const entries = data.entries || [], players = data.players || [];
    let manualBudgetIncome = 0, manualActualIncome = 0, budgetExpense = 0, actualExpense = 0;
    entries.filter(x => x.status !== 'cancelled').forEach(item => {
      if (item.kind === 'income') { manualBudgetIncome += n(item.budget_amount); manualActualIncome += n(item.actual_amount); }
      else { budgetExpense += n(item.budget_amount); actualExpense += n(item.actual_amount); }
    });
    let playerExpected = 0, playerReceived = 0, playerOutstanding = 0;
    players.forEach(row => {
      const due = ['waived','not_required','refunded'].includes(row.payment_status) ? 0 : n(row._expected);
      const received = row.payment_status === 'paid' ? due : 0;
      playerExpected += due; playerReceived += received; playerOutstanding += Math.max(0, due - received);
    });
    const expectedIncome = manualBudgetIncome + playerExpected;
    const actualIncome = manualActualIncome + playerReceived;
    const balance = actualIncome - actualExpense;
    $('efExpectedIncome').textContent = money(expectedIncome);
    $('efActualIncome').textContent = money(actualIncome);
    $('efOutstanding').textContent = money(playerOutstanding);
    $('efExpectedExpense').textContent = money(budgetExpense);
    $('efActualExpense').textContent = money(actualExpense);
    $('efBalance').textContent = money(balance);
    $('efBalance').parentElement.classList.toggle('bad', balance < 0);
    $('efBalance').parentElement.classList.toggle('good', balance >= 0);

    $('efEntries').innerHTML = entries.length ? entries.map(item => `<div class="ef-item"><div><strong>${esc(item.category)}</strong><br><small>${esc(item.description)}</small></div><div><small>Budget</small><br><b>${money(item.budget_amount)}</b></div><div><small>Reale</small><br><b>${money(item.actual_amount)}</b></div><div><span class="ef-pill ${item.status==='cancelled'?'bad':item.status==='planned'?'warn':''}">${esc(item.status)}</span></div><div class="ef-actions"><button class="btn secondary ef-edit" data-id="${esc(item.id)}">Modifica</button><button class="btn secondary ef-delete" data-id="${esc(item.id)}">Elimina</button></div></div>`).join('') : '<div class="ef-muted">Nessuna voce ancora inserita.</div>';
    $('efEntries').querySelectorAll('.ef-edit').forEach(b => b.onclick = () => editFinanceItem(entries.find(x => String(x.id) === String(b.dataset.id))));
    $('efEntries').querySelectorAll('.ef-delete').forEach(b => b.onclick = () => deleteFinanceItem(b.dataset.id));

    $('efPlayersSection').hidden = financeScope.type !== 'event';
    $('efPlayers').innerHTML = players.length ? players.map(row => {
      const due = ['waived','not_required','refunded'].includes(row.payment_status) ? 0 : n(row._expected);
      const received = row.payment_status === 'paid' ? due : 0;
      return `<tr><td><strong>${esc(row.participant_name || 'Giocatore')}</strong></td><td><span class="ef-pill ${row.payment_status==='paid'?'':'warn'}">${esc(row.payment_status)}</span></td><td>${money(due)}</td><td>${money(received)}</td><td>${money(Math.max(0,due-received))}</td></tr>`;
    }).join('') : '<tr><td colspan="5" class="ef-muted">Nessuna registrazione collegata a questo evento.</td></tr>';
  }

  async function reloadFinance() {
    try { renderFinance(await readScopeData()); }
    catch (error) { $('efEntries').innerHTML = '<div class="ef-muted">Finanze Preview non ancora disponibili: ' + esc(error.message || error) + '</div>'; }
  }

  async function openEventFinance(eventId) {
    const event = window.FilitaliaEventCatalog && window.FilitaliaEventCatalog.get(eventId);
    financeScope = { type: 'event', id: eventId };
    $('efTitle').textContent = 'Finanze · ' + (event ? event.name : eventId);
    const base = event && event.pricing ? n(event.pricing.basePrice) : 0;
    $('efSub').textContent = [event && event.city, event && event.date, base ? 'Quota base ' + money(base) : ''].filter(Boolean).join(' · ');
    resetFinanceForm(); $('eventFinanceModal').classList.add('show'); await reloadFinance();
  }

  async function openRequestFinance(request) {
    financeScope = { type: 'request', id: request.id };
    $('efTitle').textContent = 'Budget richiesta · ' + request.name;
    $('efSub').textContent = [request.city, request.proposed_date, request.expected_participants ? request.expected_participants + ' partecipanti previsti' : ''].filter(Boolean).join(' · ');
    resetFinanceForm(); $('eventFinanceModal').classList.add('show'); await reloadFinance();
  }

  function resetFinanceForm() {
    editingFinanceId = null; $('efFormTitle').textContent = 'Aggiungi voce';
    ['efCategory','efBudget','efActual','efDescription','efCounterparty','efMethod','efReceipt','efNotes'].forEach(id => { if ($(id)) $(id).value = ''; });
    $('efKind').value = 'expense'; $('efStatus').value = 'planned';
  }

  function editFinanceItem(item) {
    editingFinanceId = item.id; $('efFormTitle').textContent = 'Modifica voce';
    $('efKind').value = item.kind; $('efCategory').value = item.category || ''; $('efBudget').value = item.budget_amount || 0; $('efActual').value = item.actual_amount || 0; $('efDescription').value = item.description || ''; $('efStatus').value = item.status || 'planned'; $('efCounterparty').value = item.counterparty || ''; $('efMethod').value = item.payment_method || ''; $('efReceipt').value = item.receipt_url || ''; $('efNotes').value = item.notes || '';
  }

  async function saveFinanceItem() {
    if (!financeScope || !val('efDescription')) return notify('Inserisci una descrizione.');
    const payload = {
      request_id: financeScope.type === 'request' ? financeScope.id : null,
      event_id: financeScope.type === 'event' ? financeScope.id : null,
      kind: val('efKind'), category: val('efCategory') || 'Altro', description: val('efDescription'),
      budget_amount: n(val('efBudget')), actual_amount: n(val('efActual')), status: val('efStatus') || 'planned',
      counterparty: val('efCounterparty') || null, payment_method: val('efMethod') || null, receipt_url: val('efReceipt') || null, notes: val('efNotes') || null, created_by: profile && profile.id || null
    };
    const c = client();
    const r = editingFinanceId ? await c.from('event_finance_items').update(payload).eq('id', editingFinanceId) : await c.from('event_finance_items').insert(payload);
    if (r.error) return notify('Salvataggio non riuscito: ' + r.error.message);
    resetFinanceForm(); await reloadFinance();
  }

  async function deleteFinanceItem(id) {
    if (!confirm('Eliminare questa voce?')) return;
    const r = await client().from('event_finance_items').delete().eq('id', id);
    if (r.error) return notify(r.error.message); await reloadFinance();
  }

  function openRequestForm() {
    ['erName','erCity','erDate','erStart','erEnd','erVenue','erParticipants','erFee','erNotes'].forEach(id => { if ($(id)) $(id).value = ''; });
    $('erType').value = 'Camp / Talent ID'; d.querySelectorAll('.er-cost').forEach(i => i.value = ''); $('eventRequestModal').classList.add('show');
  }

  async function saveRequest() {
    if (!val('erName')) return notify('Inserisci il nome evento.');
    const payload = { requested_by: profile && profile.id || null, name: val('erName'), event_type: val('erType') || 'Camp / Talent ID', city: val('erCity') || null, proposed_date: val('erDate') || null, start_time: val('erStart') || null, end_time: val('erEnd') || null, venue: val('erVenue') || null, expected_participants: val('erParticipants') ? Number(val('erParticipants')) : null, expected_fee: val('erFee') ? n(val('erFee')) : null, status: 'submitted', notes: val('erNotes') || null };
    const created = await client().from('event_requests').insert(payload).select('*').single();
    if (created.error) return notify('Richiesta non salvata: ' + created.error.message);
    const items = [];
    d.querySelectorAll('.er-cost').forEach(input => { const amount = n(input.value); if (amount > 0) items.push({ request_id: created.data.id, kind:'expense', category:input.dataset.category || 'Altro', description:input.dataset.category || 'Costo previsto', budget_amount:amount, actual_amount:0, status:'planned', created_by:profile && profile.id || null }); });
    if (items.length) { const ir = await client().from('event_finance_items').insert(items); if (ir.error) console.warn(ir.error); }
    $('eventRequestModal').classList.remove('show'); notify('Richiesta evento salvata.'); await openRequestFinance(created.data);
  }

  function statusPill(status) { const kind = status === 'approved' || status === 'converted' ? '' : status === 'rejected' ? 'bad' : 'warn'; return `<span class="ef-pill ${kind}">${esc(status)}</span>`; }

  async function openRequestsList() {
    $('eventRequestsListModal').classList.add('show'); $('erList').innerHTML = '<div class="ef-muted">Caricamento...</div>';
    const res = await client().from('event_requests').select('*').order('created_at', { ascending:false });
    if (res.error) { $('erList').innerHTML = '<div class="ef-muted">' + esc(res.error.message) + '</div>'; return; }
    const requests = res.data || [];
    const items = await client().from('event_finance_items').select('request_id,kind,budget_amount,actual_amount');
    const allItems = items.data || [];
    $('erList').innerHTML = requests.length ? requests.map(r => {
      const scoped = allItems.filter(x => String(x.request_id) === String(r.id));
      const cost = scoped.filter(x => x.kind === 'expense').reduce((s,x)=>s+n(x.budget_amount),0);
      const income = (n(r.expected_participants) * n(r.expected_fee)) + scoped.filter(x=>x.kind==='income').reduce((s,x)=>s+n(x.budget_amount),0);
      const margin = income - cost;
      return `<div class="ef-request-card"><div class="ef-request-head"><div><strong>${esc(r.name)}</strong><div class="ef-muted">${esc([r.city,r.proposed_date,r.venue].filter(Boolean).join(' · '))}</div></div>${statusPill(r.status)}</div><div class="ef-muted" style="margin-top:9px">Costi previsti <b>${money(cost)}</b> · Entrate previste <b>${money(income)}</b> · Margine previsto <b>${money(margin)}</b></div><div class="ef-actions" style="margin-top:10px"><button class="btn secondary er-budget" data-id="${r.id}">Budget</button>${isAdmin() && ['submitted','review'].includes(r.status) ? `<button class="btn primary er-approve" data-id="${r.id}">Approva</button><button class="btn secondary er-reject" data-id="${r.id}">Rifiuta</button>`:''}${isAdmin() && r.status === 'approved' ? `<button class="btn primary er-convert" data-id="${r.id}">Crea evento</button>`:''}${r.event_id ? `<button class="btn secondary er-eventfinance" data-event="${esc(r.event_id)}">Finanze evento</button>`:''}</div></div>`;
    }).join('') : '<div class="ef-muted">Nessuna richiesta evento.</div>';
    $('erList').querySelectorAll('.er-budget').forEach(b => b.onclick = () => { const r=requests.find(x=>String(x.id)===String(b.dataset.id)); if(r) openRequestFinance(r); });
    $('erList').querySelectorAll('.er-approve').forEach(b => b.onclick = () => decideRequest(b.dataset.id,'approved'));
    $('erList').querySelectorAll('.er-reject').forEach(b => b.onclick = () => decideRequest(b.dataset.id,'rejected'));
    $('erList').querySelectorAll('.er-convert').forEach(b => b.onclick = () => convertRequest(requests.find(x=>String(x.id)===String(b.dataset.id))));
    $('erList').querySelectorAll('.er-eventfinance').forEach(b => b.onclick = () => openEventFinance(b.dataset.event));
  }

  async function decideRequest(id, status) {
    const note = status === 'rejected' ? (prompt('Motivo del rifiuto (facoltativo):') || '') : '';
    const payload = { status, decision_notes: note || null, approved_by: status === 'approved' ? profile.id : null, approved_at: status === 'approved' ? new Date().toISOString() : null };
    const r = await client().from('event_requests').update(payload).eq('id', id);
    if (r.error) return notify(r.error.message); await openRequestsList();
  }

  async function convertRequest(request) {
    if (!request || !window.FilitaliaEventCatalog) return;
    const eventId = 'request-' + String(request.id).slice(0,8);
    try {
      const event = await window.FilitaliaEventCatalog.save({ id:eventId, name:request.name, type:request.event_type, city:request.city || '', date:request.proposed_date || '', startTime:request.start_time || '', endTime:request.end_time || '', venue:request.venue || '', status:'draft', categories:['Open'], pricing:{ basePrice:n(request.expected_fee), categoryPrices:{Open:n(request.expected_fee)}, u12Free:false, shirtIncludedOverU12:false, shirtPrice:0, extraShirtPrice:0, promoCodes:[] } });
      const rr = await client().from('event_requests').update({ status:'converted', event_id:event.id }).eq('id', request.id); if (rr.error) throw rr.error;
      const fr = await client().from('event_finance_items').update({ event_id:event.id }).eq('request_id', request.id); if (fr.error) throw fr.error;
      notify('Evento creato in bozza con il budget collegato.'); enhance(); await openRequestsList();
    } catch (error) { notify('Conversione non riuscita: ' + (error.message || error)); }
  }

  async function init() {
    installStyle(); buildUi();
    try {
      if (!window.FilitaliaAuth || !window.FilitaliaAuth.client) return;
      profile = await window.FilitaliaAuth.getOwnProfile();
      if (!profile || profile.status !== 'active' || !['admin','super_admin','coordinator','city_coordinator','coach'].includes(role())) return;
      enhance();
      new MutationObserver(enhance).observe(d.body, { childList:true, subtree:true });
      window.FilitaliaEventFinance = Object.freeze({ openEvent:openEventFinance, openRequests:openRequestsList, newRequest:openRequestForm });
    } catch (error) { console.warn('Event finance unavailable', error); }
  }

  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', init) : init();
})();
