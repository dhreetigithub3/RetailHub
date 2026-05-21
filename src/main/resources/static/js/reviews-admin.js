(() => {
  const qs = (sel) => document.querySelector(sel);

  const el = {
    searchInput: qs('#searchInput'),
    starFilter: qs('#adminStarFilter'),
    startDateInput: qs('#adminStartDate'),
    endDateInput: qs('#adminEndDate'),
    applyFiltersBtn: qs('#applyFiltersBtn'),
    clearFiltersBtn: qs('#clearFiltersBtn'),
    resultsMeta: qs('#resultsMeta'),
    tbody: qs('#reviewsTbody'),
    pagination: qs('#reviewsPagination'),
  };

  let state = {
    page: 0,
    size: 10,
    filters: {}
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  function getTokenHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  function getFilters() {
    const f = {};

    const search = el.searchInput?.value?.trim();
    if (search) f.search = search;

    const starVal = el.starFilter?.value;
    if (starVal && starVal !== 'all') {
      f.minRating = Number(starVal);
      f.maxRating = Number(starVal);
    }

    const startDate = el.startDateInput?.value;
    if (startDate) f.startDate = startDate;

    const endDate = el.endDateInput?.value;
    if (endDate) f.endDate = endDate;

    return f;
  }

  function renderPagination(p) {
    const { number, totalPages, size } = p;
    if (!el.pagination) return;
    if (totalPages <= 1) {
      el.pagination.innerHTML = '';
      return;
    }

    const prevDisabled = number <= 0;
    const nextDisabled = number >= totalPages - 1;

    el.pagination.innerHTML = `
      <button class="btn btn-outline btn-sm" ${prevDisabled ? 'disabled' : ''} data-page="${number - 1}">Prev</button>
      <span class="text-muted" style="margin:0 12px;">Page ${number + 1} / ${totalPages}</span>
      <button class="btn btn-outline btn-sm" ${nextDisabled ? 'disabled' : ''} data-page="${number + 1}">Next</button>
    `;

    el.pagination.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetPage = Number(btn.getAttribute('data-page'));
        if (Number.isNaN(targetPage)) return;
        state.page = targetPage;
        load();
      });
    });
  }

  async function apiList() {
    const query = new URLSearchParams();
    query.set('page', String(state.page));
    query.set('size', String(state.size));

    const f = state.filters || {};
    if (f.search) query.set('search', f.search);
    if (f.minRating !== undefined && f.minRating !== null) query.set('minRating', String(f.minRating));
    if (f.maxRating !== undefined && f.maxRating !== null) query.set('maxRating', String(f.maxRating));
    if (f.startDate) query.set('startDate', f.startDate);
    if (f.endDate) query.set('endDate', f.endDate);

    const res = await fetch(`/admin/reviews?${query.toString()}`, {
      headers: {
        ...getTokenHeaders()
      }
    });

    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  }



  async function apiRemove(reviewId) {
    const res = await fetch(`/admin/reviews/${encodeURIComponent(reviewId)}/remove`, {
      method: 'POST',
      headers: {
        ...getTokenHeaders(),
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!res.ok) throw new Error('Failed to remove review');
  }

  function statusBadge(moderationStatus) {
    const status = moderationStatus || 'PUBLISHED';

    let cls = 'status-badge';
    if (status === 'PUBLISHED') cls += ' badge-success';
    if (status === 'REMOVED') cls += ' badge-muted';

    return `<span class="${cls}">${escapeHtml(status)}</span>`;
  }

  function renderTablePage(pageDto) {
    const { content, totalElements, number, size: s } = pageDto;

    if (!content?.length) {
      el.tbody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align: center; padding: 3rem;">No reviews found.</td></tr>`;
      el.resultsMeta.textContent = 'No results';
      return;
    }

    el.tbody.innerHTML = content.map((r) => {
      const rating = Number(r.rating ?? 0);
      const comment = r.comment ? escapeHtml(r.comment) : '<span class="text-muted">No comment</span>';
      const reviewedAt = r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '';

      const moderation = r.moderationStatus || 'PUBLISHED';
      const canRemove = moderation !== 'REMOVED';

      return `
        <tr>
          <td>${escapeHtml(r.reviewId)}</td>
          <td>${escapeHtml(r.customerName || '')}<div class="text-muted" style="font-size:12px;">#${escapeHtml(r.customerId)}</div></td>
          <td>${escapeHtml(r.productName || '')}<div class="text-muted" style="font-size:12px;">#${escapeHtml(r.productId)}</div></td>
          <td><strong>${rating.toFixed(0)}</strong></td>
          <td>${comment}</td>
          <td>${reviewedAt || '<span class="text-muted">-</span>'}</td>
          <td>${statusBadge(moderation)}</td>
          <td>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-danger btn-sm" ${canRemove ? '' : 'disabled'} data-action="remove" data-id="${escapeHtml(r.reviewId)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    el.resultsMeta.textContent = `Showing ${content.length} of ${totalElements} result(s).`;

    el.tbody.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reviewId = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (!reviewId || !action) return;

        const ok = window.confirm('Delete this review?');
        if (!ok) return;

        try {
          btn.disabled = true;
          if (action === 'remove') await apiRemove(reviewId);
          await load();
        } catch (e) {
          alert(e?.message || 'Action failed');
          btn.disabled = false;
        }
      });
    });
  }

  async function load() {
    el.tbody.innerHTML = `<tr><td colspan="8" class="text-muted">Loading...</td></tr>`;
    el.resultsMeta.textContent = 'Loading...';

    try {
      const pageDto = await apiList();
      renderTablePage(pageDto);
      renderPagination({
        number: pageDto.number,
        totalPages: pageDto.totalPages,
      });
      return pageDto;
    } catch (e) {
      el.tbody.innerHTML = `<tr><td colspan="8" class="text-muted">${escapeHtml(e?.message || 'Failed to load reviews')}</td></tr>`;
      el.resultsMeta.textContent = 'Error';
      el.pagination.innerHTML = '';
      throw e;
    }
  }

  el.applyFiltersBtn?.addEventListener('click', () => {
    state.page = 0;
    state.filters = getFilters();
    load();
  });

  el.clearFiltersBtn?.addEventListener('click', () => {
    if (el.searchInput) el.searchInput.value = '';
    if (el.starFilter) el.starFilter.value = 'all';
    if (el.startDateInput) el.startDateInput.value = '';
    if (el.endDateInput) el.endDateInput.value = '';

    state.page = 0;
    state.filters = {};
    load();
  });

  // Initial load
  document.addEventListener('DOMContentLoaded', () => {
    state.filters = getFilters();
    load();
  });
})();

