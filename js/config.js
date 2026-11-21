/**
 * QUALISSURE Laboratory Services - Global Configuration & Constants
 * Update API_BASE_URL here to manage endpoints site-wide from a single place.
 */
const APP_CONFIG = {
    // Change this to your production, staging, or server domain (e.g. 'https://api.qualissure.com')
    API_BASE_URL: 'https://localhost:7108',

    // API Routes
    ENDPOINTS: {
        JOB_CHALLENGE: '/api/public/job/challenge',
        JOB_APPLY: '/api/public/job/apply'
    }
};

// Prevent accidental mutation
if (typeof Object.freeze === 'function') {
    Object.freeze(APP_CONFIG);
    Object.freeze(APP_CONFIG.ENDPOINTS);
}
