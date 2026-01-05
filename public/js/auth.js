// Authentication state management for Qaran Exchange
// This script handles session checking and UI updates across all pages

(function() {
    'use strict';

    let currentUser = null;

    // Check if user is authenticated using localStorage
    function checkAuth() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            const userStr = localStorage.getItem('user');
            
            if (isLoggedIn === 'true' && userStr) {
                currentUser = JSON.parse(userStr);
                updateNavigation(true);
            } else {
                currentUser = null;
                updateNavigation(false);
            }
        } catch (error) {
            console.log('Authentication check error:', error.message);
            currentUser = null;
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
    function handleLogout() {
        try {
            // Clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            
            currentUser = null;
            updateNavigation(false);
            
            // Redirect to home if on protected page
            if (window.location.pathname.includes('dashboard')) {
                window.location.href = 'index.html';
            } else {
                // Reload current page to update UI
                window.location.reload();
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Clear and redirect anyway
            localStorage.clear();
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
