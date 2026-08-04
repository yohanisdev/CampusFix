document.addEventListener('DOMContentLoaded', async () => {
    // Enforce Student Authentication
    const user = checkAuth('STUDENT');
    if (!user) return;

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = `${user.name} (Student)`;

    let allReports = [];

    // Identify current active page
    const path = window.location.pathname;

    if (path.endsWith('student-dashboard.html') || path === '/') {
        await loadDashboard();
    } else if (path.endsWith('my-reports.html')) {
        await loadMyReports();
    } else if (path.endsWith('report-details.html')) {
        await loadReportDetails();
    }

    // 1. Dashboard Handler: Fetch statistics and recent items
    async function loadDashboard() {
        try {
            const data = await apiFetch('/reports');
            allReports = data.reports || [];

            // Calculate Metrics
            const total = allReports.length;
            const pending = allReports.filter(r => r.status === 'PENDING').length;
            const inProgress = allReports.filter(r => r.status === 'IN_PROGRESS').length;
            const resolved = allReports.filter(r => r.status === 'RESOLVED').length;

            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-in-progress').textContent = inProgress;
            document.getElementById('stat-resolved').textContent = resolved;

            // Render top 5 recent reports
            const recentContainer = document.getElementById('recent-reports-container');
            const recent = allReports.slice(0, 5);

            if (recent.length === 0) {
                recentContainer.innerHTML = '<p style="color: #64748b;">No reports submitted yet. Click "Report New Problem" to create one.</p>';
                return;
            }

            recentContainer.innerHTML = renderReportsTable(recent);
        } catch (err) {
            console.error(err);
        }
    }

    // 2. My Reports Handler: Search & Filter functionality
    async function loadMyReports() {
        try {
            const data = await apiFetch('/reports');
            allReports = data.reports || [];

            const searchInput = document.getElementById('search-input');
            const filterStatus = document.getElementById('filter-status');
            const filterPriority = document.getElementById('filter-priority');

            function applyFilters() {
                const query = (searchInput.value || '').toLowerCase().trim();
                const statusVal = filterStatus.value;
                const priorityVal = filterPriority.value;

                const filtered = allReports.filter(r => {
                    const matchesSearch = r.title.toLowerCase().includes(query) || r.location.toLowerCase().includes(query);
                    const matchesStatus = statusVal === 'ALL' || r.status === statusVal;
                    const matchesPriority = priorityVal === 'ALL' || r.priority === priorityVal;
                    return matchesSearch && matchesStatus && matchesPriority;
                });

                document.getElementById('reports-table-container').innerHTML = renderReportsTable(filtered);
            }

            searchInput.addEventListener('input', applyFilters);
            filterStatus.addEventListener('change', applyFilters);
            filterPriority.addEventListener('change', applyFilters);

            applyFilters();
        } catch (err) {
            console.error(err);
        }
    }

    // 3. Report Details Handler
    async function loadReportDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const reportId = urlParams.get('id');
        const container = document.getElementById('details-container');

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
                        <span style="color: #64748b; font-size: 0.9rem;">Reported on ${formattedDate} | ID: #${r.id}</span>
                    </div>
                    <div>
                        <span class="badge badge-${r.status}">${r.status}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <strong>Category:</strong> ${r.category}
                    </div>
                    <div>
                        <strong>Location:</strong> ${r.location}
                    </div>
                    <div>
                        <strong>Priority Level:</strong> <span class="priority-${r.priority}">${r.priority}</span>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <strong>Detailed Description:</strong>
                    <p style="background-color: #f8fafc; padding: 1rem; border-radius: 6px; margin-top: 0.5rem; border: 1px solid #cbd5e1;">${r.description}</p>
                </div>

                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                    <h3 style="margin-bottom: 0.5rem;">Administrator Resolution Notes</h3>
                    <div style="background-color: #f1f5f9; padding: 1rem; border-radius: 6px; color: #334155;">
                        ${r.admin_note ? r.admin_note : '<em>No administrator updates have been logged yet.</em>'}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<p style="color: #ef4444;">Error: ${err.message}</p>`;
        }
    }

    // Helper: HTML Renderer for Report Tables
    function renderReportsTable(reportsList) {
        if (!reportsList || reportsList.length === 0) {
            return '<p style="color: #64748b; padding: 1rem; text-align: center;">No matching reports found.</p>';
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
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
                    <td>${r.category}</td>
                    <td>${r.location}</td>
                    <td><span class="priority-${r.priority}">${r.priority}</span></td>
                    <td><span class="badge badge-${r.status}">${r.status}</span></td>
                    <td>
                        <a href="report-details.html?id=${r.id}" class="btn btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">View Details</a>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }
});