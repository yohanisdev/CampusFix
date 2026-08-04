document.addEventListener('DOMContentLoaded', async () => {
    // 1. Strict Authorization Gatekeeper (ADMIN Role Required)
    const user = checkAuth('ADMIN');
    if (!user) return;

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = `${user.name} (Admin)`;

    let allReports = [];
    const path = window.location.pathname;

    if (path.endsWith('admin-dashboard.html')) {
        await loadAdminDashboard();
    } else if (path.endsWith('admin-reports.html')) {
        await loadAdminReports();
    } else if (path.endsWith('admin-report-details.html')) {
        await loadAdminReportDetails();
    }

    // 2. Admin Dashboard Overview Handler
    async function loadAdminDashboard() {
        try {
            const data = await apiFetch('/admin/reports');
            allReports = data.reports || [];

            // Compute Admin System Statistics
            const total = allReports.length;
            const pending = allReports.filter(r => r.status === 'PENDING').length;
            const inProgress = allReports.filter(r => r.status === 'IN_PROGRESS').length;
            const resolved = allReports.filter(r => r.status === 'RESOLVED').length;
            const critical = allReports.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH').length;

            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-in-progress').textContent = inProgress;
            document.getElementById('stat-resolved').textContent = resolved;
            document.getElementById('stat-critical').textContent = critical;

            // Render Urgent Issues Queue
            const urgentContainer = document.getElementById('urgent-reports-container');
            const urgentList = allReports.filter(r => (r.priority === 'CRITICAL' || r.priority === 'HIGH') && r.status !== 'RESOLVED');

            if (urgentList.length === 0) {
                urgentContainer.innerHTML = '<p style="color: #166534; padding: 1rem; background: #bbf7d0; border-radius: 6px;">🎉 No pending high or critical hazards registered!</p>';
                return;
            }

            urgentContainer.innerHTML = renderAdminTable(urgentList);
        } catch (err) {
            console.error(err);
        }
    }

    // 3. Admin Reports Management Handler
    async function loadAdminReports() {
        try {
            const data = await apiFetch('/admin/reports');
            allReports = data.reports || [];

            const searchInput = document.getElementById('search-input');
            const filterStatus = document.getElementById('filter-status');
            const filterPriority = document.getElementById('filter-priority');

            function applyFilters() {
                const query = (searchInput.value || '').toLowerCase().trim();
                const statusVal = filterStatus.value;
                const priorityVal = filterPriority.value;

                const filtered = allReports.filter(r => {
                    const studentName = r.user_name ? r.user_name.toLowerCase() : '';
                    const matchesSearch = r.title.toLowerCase().includes(query) || 
                                          r.location.toLowerCase().includes(query) || 
                                          studentName.includes(query);
                    const matchesStatus = statusVal === 'ALL' || r.status === statusVal;
                    const matchesPriority = priorityVal === 'ALL' || r.priority === priorityVal;
                    return matchesSearch && matchesStatus && matchesPriority;
                });

                document.getElementById('admin-reports-table-container').innerHTML = renderAdminTable(filtered);
            }

            searchInput.addEventListener('input', applyFilters);
            filterStatus.addEventListener('change', applyFilters);
            filterPriority.addEventListener('change', applyFilters);

            applyFilters();
        } catch (err) {
            console.error(err);
        }
    }

    // 4. Admin Report Details & Action Handler
    async function loadAdminReportDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const reportId = urlParams.get('id');
        const container = document.getElementById('details-container');
        const actionsCard = document.getElementById('actions-card');

        if (!reportId) {
            container.innerHTML = '<p style="color: #ef4444;">Invalid Report ID specified.</p>';
            return;
        }

        try {
            const data = await apiFetch(`/reports/${reportId}`);
            const r = data.report;

            const formattedDate = new Date(r.created_at).toLocaleString();

            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;">
                    <div>
                        <h2 style="margin-bottom: 0.3rem;">${r.title}</h2>
                        <span style="color: #64748b; font-size: 0.9rem;">Submitted by: <strong>${r.user_name || 'Student #' + r.user_id}</strong> (${r.user_email || 'N/A'}) on ${formattedDate}</span>
                    </div>
                    <div>
                        <span class="badge badge-${r.status}">${r.status}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div><strong>Category:</strong> ${r.category}</div>
                    <div><strong>Location:</strong> ${r.location}</div>
                    <div><strong>Priority:</strong> <span class="priority-${r.priority}">${r.priority}</span></div>
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>Student Description:</strong>
                    <p style="background-color: #f8fafc; padding: 1rem; border-radius: 6px; margin-top: 0.5rem; border: 1px solid #cbd5e1;">${r.description}</p>
                </div>
            `;

            // Prefill update form fields
            document.getElementById('update-status').value = r.status;
            document.getElementById('update-priority').value = r.priority;
            document.getElementById('admin-notes').value = r.admin_note || '';

            actionsCard.style.display = 'block';

            // Handle Administrative Status/Priority/Note updates
            const form = document.getElementById('admin-update-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const newStatus = document.getElementById('update-status').value;
                const newPriority = document.getElementById('update-priority').value;
                const newNote = document.getElementById('admin-notes').value.trim();

                try {
                    // Update Status
                    await apiFetch(`/admin/reports/${reportId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: newStatus })
                    });

                    // Update Priority
                    await apiFetch(`/admin/reports/${reportId}/priority`, {
                        method: 'PUT',
                        body: JSON.stringify({ priority: newPriority })
                    });

                    // Update Resolution Notes
                    await apiFetch(`/admin/reports/${reportId}/note`, {
                        method: 'PUT',
                        body: JSON.stringify({ admin_note: newNote })
                    });

                    showAlert('Status, priority, and resolution notes updated successfully!', 'success');
                    setTimeout(() => window.location.reload(), 1200);
                } catch (err) {
                    showAlert(`Update failed: ${err.message}`, 'error');
                }
            });

            // Handle Spam Deletion
            const deleteBtn = document.getElementById('btn-delete-report');
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this report permanently?')) {
                    try {
                        await apiFetch(`/reports/${reportId}`, { method: 'DELETE' });
                        alert('Report successfully deleted.');
                        window.location.href = 'admin-reports.html';
                    } catch (err) {
                        showAlert(`Deletion failed: ${err.message}`, 'error');
                    }
                }
            });

        } catch (err) {
            container.innerHTML = `<p style="color: #ef4444;">Error fetching administrative details: ${err.message}</p>`;
        }
    }

    // Helper: Admin Alerts
    function showAlert(msg, type) {
        const box = document.getElementById('alert-box');
        if (!box) return;
        box.textContent = msg;
        box.style.display = 'block';
        box.style.backgroundColor = type === 'success' ? '#bbf7d0' : '#fecaca';
        box.style.color = type === 'success' ? '#166534' : '#991b1b';
    }

    // Helper: Admin Table Renderer
    function renderAdminTable(reportsList) {
        if (!reportsList || reportsList.length === 0) {
            return '<p style="color: #64748b; padding: 1rem; text-align: center;">No matching reports found.</p>';
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Student</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reportsList.forEach(r => {
            html += `
                <tr>
                    <td>#${r.id}</td>
                    <td style="font-weight: 600;">${r.title}</td>
                    <td>${r.user_name || 'User #' + r.user_id}</td>
                    <td>${r.location}</td>
                    <td><span class="priority-${r.priority}">${r.priority}</span></td>
                    <td><span class="badge badge-${r.status}">${r.status}</span></td>
                    <td>
                        <a href="admin-report-details.html?id=${r.id}" class="btn btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.85rem; background-color: #0f172a;">Manage</a>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }
});