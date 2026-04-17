  // ===== PQRs (Supabase) =====
  const PQR_STATUS_LABELS = { open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' };

  async function renderPqrsTable() {
    const tbody = document.getElementById('pqrsTableBody');
    if (!tbody) return;
    const filterEl = document.getElementById('pqrStatusFilter');
    const statusFilter = filterEl ? filterEl.value : 'all';

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';

    let pqrs = [];
    try { pqrs = await SB.getAllPqrs(); } catch (e) { console.warn('[Admin] PQR load:', e.message); }

    if (statusFilter !== 'all') pqrs = pqrs.filter(p => (p.status || 'open') === statusFilter);

    if (pqrs.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay PQRs${statusFilter !== 'all' ? ' con este estado' : ''}.</td></tr>`; return; }

    const typeLabels = { peticion: 'Petici\u00f3n', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
    tbody.innerHTML = pqrs.map(p => {
      const status = p.status || 'open';
      return `<tr>
        <td><strong>${escapeHTML((p.id || '').substring(0, 8))}</strong></td>
        <td>${escapeHTML(typeLabels[p.type] || p.type || 'Petici\u00f3n')}</td>
        <td>${escapeHTML(p.subject || '\u2014')}</td>
        <td>${escapeHTML(p.user_email || '\u2014')}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '\u2014'}</td>
        <td><span class="table-status ${status === 'open' ? 'inactive' : 'active'}"><span class="table-status-dot"></span>${PQR_STATUS_LABELS[status] || status}</span></td>
        <td><button class="table-btn" data-action="view-pqr" data-pqr-id="${escapeAttr(p.id)}" title="Ver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="view-pqr"]').forEach(btn => {
      btn.addEventListener('click', () => openPqrDetail(btn.dataset.pqrId, pqrs));
    });
  }

  async function openPqrDetail(pqrId, pqrs) {
    if (!pqrs) { try { pqrs = await SB.getAllPqrs(); } catch { pqrs = []; } }
    const pqr = pqrs.find(p => p.id === pqrId);
    if (!pqr) return;
    const typeLabels = { peticion: 'Petici\u00f3n', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
    document.getElementById('pqrDetailTitle').textContent = 'PQR #' + (pqr.id || '').substring(0, 8);
    document.getElementById('pqrReplyId').value = pqrId;
    document.getElementById('pqrReplyText').value = pqr.admin_reply || '';
    document.getElementById('pqrDetailBody').innerHTML = `
      <div style="margin-bottom:var(--spacing-md)">
        <strong>Tipo:</strong> ${escapeHTML(typeLabels[pqr.type] || pqr.type || 'Petici\u00f3n')}<br>
        <strong>Asunto:</strong> ${escapeHTML(pqr.subject || '\u2014')}<br>
        <strong>Usuario:</strong> ${escapeHTML(pqr.user_email || '\u2014')}<br>
        <strong>Fecha:</strong> ${pqr.created_at ? new Date(pqr.created_at).toLocaleString('es-CO') : '\u2014'}<br>
        <strong>Estado:</strong> ${PQR_STATUS_LABELS[pqr.status || 'open']}
      </div>
      <div style="background:var(--bg-secondary);padding:var(--spacing-md);border-radius:var(--radius-md);margin-bottom:var(--spacing-md)">
        <strong>Mensaje:</strong><br>${escapeHTML(pqr.message || '')}
      </div>
      ${pqr.admin_reply ? `<div style="background:rgba(52,199,89,0.08);padding:var(--spacing-md);border-radius:var(--radius-md);border-left:3px solid var(--success)"><strong>Respuesta admin:</strong><br>${escapeHTML(pqr.admin_reply)}</div>` : ''}
    `;
    document.getElementById('pqrDetailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closePqrDetail() { document.getElementById('pqrDetailOverlay').classList.remove('active'); document.body.style.overflow = ''; }

  async function savePqrReply() {
    const id = document.getElementById('pqrReplyId').value;
    const reply = document.getElementById('pqrReplyText').value.trim();
    if (!reply) { showToast('Escribe una respuesta', 'error'); return; }
    try {
      await SB.replyPqr(id, reply);
      showToast('Respuesta enviada', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    closePqrDetail(); renderPqrsTable();
  }

  // ===== ADMIN REVIEWS =====
  async function renderReviewsTable() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';

    let reviews = [];
    try { reviews = await SB.getAllReviews(); } catch (e) { console.warn('[Admin] Reviews load:', e.message); }

    const products = getProducts();

    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay rese\u00f1as.</td></tr>';
      return;
    }

    tbody.innerHTML = reviews.map(r => {
      const prod = products.find(p => p.id === r.product_id);
      const stars = '\u2605'.repeat(r.rating) + '\u2606'.repeat(5 - r.rating);
      return `<tr>
        <td>${escapeHTML(prod ? prod.name : (r.product_id || '').substring(0, 8))}</td>
        <td>${escapeHTML(r.user_name || 'An\u00f3nimo')}</td>
        <td style="color:var(--primary-orange);letter-spacing:2px;">${stars}</td>
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeAttr(r.comment || '')}">${escapeHTML(r.comment || '\u2014')}</td>
        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '\u2014'}</td>
        <td><button class="table-btn delete" data-action="delete-review" data-review-id="${escapeAttr(r.id)}" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="delete-review"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('\u00bfEliminar esta rese\u00f1a?')) return;
        try {
          await SB.deleteReview(btn.dataset.reviewId);
          showToast('Rese\u00f1a eliminada', 'success');
          renderReviewsTable();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
      });
    });
  }

