document.addEventListener('DOMContentLoaded', () => {
    // 1. Enforce Student Role Access
    const user = checkAuth('STUDENT');
    if (!user) return;

    // Display student name in header
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `${user.name} (Student)`;
    }

    const reportForm = document.getElementById('report-form');
    const categorySelect = document.getElementById('category');
    const prioritySelect = document.getElementById('priority');
    const titleInput = document.getElementById('title');
    const errorBox = document.getElementById('error-message');
    const successBox = document.getElementById('success-message');

    function showError(msg) {
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
        }
        if (successBox) successBox.style.display = 'none';
    }

    function showSuccess(msg) {
        if (successBox) {
            successBox.textContent = msg;
            successBox.style.display = 'block';
        }
        if (errorBox) errorBox.style.display = 'none';
    }

    // 2. Smart Priority Suggestion (Only auto-suggests when category is CHANGED by user)
    function calculateSmartPriority() {
        const category = categorySelect.value;
        const titleText = (titleInput.value || '').toLowerCase();

        if (category === 'Electricity' || category === 'Security' || titleText.includes('fire') || titleText.includes('hazard')) {
            prioritySelect.value = 'CRITICAL';
        } else if (category === 'Water' || category === 'Sanitation' || titleText.includes('leak')) {
            prioritySelect.value = 'HIGH';
        } else if (category === 'Internet / Wi-Fi' || category === 'Classroom') {
            prioritySelect.value = 'MEDIUM';
        } else if (category === 'Furniture' || category === 'Other') {
            prioritySelect.value = 'LOW';
        }
    }

    // ONLY auto-suggest on initial category selection so user overrides remain intact
    if (categorySelect) {
        categorySelect.addEventListener('change', calculateSmartPriority);
    }

    // 3. Handle Form Submission
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('title').value.trim();
            const category = document.getElementById('category').value;
            const location = document.getElementById('location').value.trim();
            const priority = document.getElementById('priority').value; // Reads user's actual selected priority
            const description = document.getElementById('description').value.trim();

            if (!title || !category || !location || !description) {
                showError('Please fill out all required fields.');
                return;
            }

            try {
                await apiFetch('/reports', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        category,
                        location,
                        priority, // Sent straight to PostgreSQL
                        description
                    })
                });

                showSuccess('Report submitted successfully! Redirecting to dashboard...');
                reportForm.reset();

                setTimeout(() => {
                    window.location.href = 'student-dashboard.html';
                }, 1500);
            } catch (err) {
                showError(err.message || 'Failed to submit report. Please try again.');
            }
        });
    }
});