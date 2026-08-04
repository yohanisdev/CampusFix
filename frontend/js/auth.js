document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('error-message');
    const successBox = document.getElementById('success-message');

    // Helper: Display inline notification
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

    // Redirect active session if user visits login/register page
    const existingToken = localStorage.getItem('token');
    const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (existingToken && existingUser.role) {
        if (existingUser.role === 'ADMIN') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'student-dashboard.html';
        }
    }

    // 1. Handle Registration Form Submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const data = await apiFetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password, role })
                });

                showSuccess('Registration successful! Redirecting to login...');
                registerForm.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } catch (err) {
                showError(err.message || 'Registration failed.');
            }
        });
    }

    // 2. Handle Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const data = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                // Store JWT and User Profile locally
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect based on backend role
                if (data.user.role === 'ADMIN') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'student-dashboard.html';
                }
            } catch (err) {
                showError(err.message || 'Invalid email or password.');
            }
        });
    }
});