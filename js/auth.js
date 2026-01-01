// Authentication state management for Qaran Exchange
// This script handles session checking and UI updates across all pages

(function() {
    'use strict';

    let currentUser = null;

    // Check if user is authenticated
    async function checkAuth() {
        try {
            const response = await fetch('/api/check-session');
            const data = await response.json();

            if (data.authenticated && data.user) {
                currentUser = data.user;
                updateNavigation(true);
            } else {
                currentUser = null;
                updateNavigation(false);
            }
        } catch (error) {
            // Server might not be running or endpoint not available
            console.log('Authentication check skipped:', error.message);
            updateNavigation(false);
        }
    }

    // Update navigation based on auth state
    function updateNavigation(isAuthenticated) {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userNameNav = document.getElementById('userNameNav');
        const userBtn = document.getElementById('userBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (!authButtons || !userMenu) return;

        if (isAuthenticated && currentUser) {
            // Hide login/register buttons
            authButtons.style.display = 'none';
            
            // Show user menu
            userMenu.style.display = 'flex';
            
            // Update user name
            if (userNameNav) {
                const firstName = currentUser.name.split(' ')[0];
                userNameNav.textContent = firstName;
            }

            // Setup user menu dropdown
            if (userBtn && userDropdown) {
                userBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userDropdown.classList.toggle('show');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    userDropdown.classList.remove('show');
                });
            }

            // Setup logout
            const logoutLink = document.getElementById('logoutLink');
            if (logoutLink) {
                logoutLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await handleLogout();
                });
            }
        } else {
            // Show login/register buttons
            authButtons.style.display = 'flex';
            
            // Hide user menu
            userMenu.style.display = 'none';
        }
    }

    // Handle logout
    async function handleLogout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                currentUser = null;
                updateNavigation(false);
                // Redirect to home if on protected page
                if (window.location.pathname.includes('dashboard')) {
                    window.location.href = 'index.html';
                } else {
                    // Reload current page to update UI
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Even if server fails, clear client state
            window.location.href = 'index.html';
        }
    }

    // Initialize auth check when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // Expose API for other scripts if needed
    window.QaranAuth = {
        getCurrentUser: () => currentUser,
        isAuthenticated: () => !!currentUser,
        checkAuth: checkAuth,
        logout: handleLogout
    };
})();
