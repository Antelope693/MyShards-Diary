
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const MAINTAINER_CREDENTIALS = { emailOrUsername: '羚羊', password: 'admin123' }; // Adjust if needed
const ADMIN_CREDENTIALS = { emailOrUsername: 'Default', password: 'DefaultPassword' };
const USER_CREDENTIALS = { emailOrUsername: 'User693', password: 'UserPassword' };

async function login(creds: any) {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, creds);
        return res.data.token;
    } catch (e) {
        console.error('Login failed for', creds.emailOrUsername, e.message);
        return null;
    }
}

async function runTests() {
    console.log('--- Social Features Verification ---');

    const adminToken = await login(MAINTAINER_CREDENTIALS) || await login(ADMIN_CREDENTIALS);
    if (!adminToken) {
        console.error('Admin login failed. Cannot proceed with Admin tests.');
        return;
    }

    // 1. Test Recommendations
    try {
        console.log('\n[TEST] Get Recommendations (Random)...');
        const recRes = await axios.get(`${API_URL}/recommendations?type=random`);
        console.log(`PASS: Got ${recRes.data.length} recommendations.`);
    } catch (e) {
        console.error('FAIL: Recommendations', e.message);
    }

    // 2. Test User Pinning
    const testUserId = 2; // Assuming a user exists
    try {
        console.log(`\n[TEST] Pinning User ID ${testUserId}...`);
        await axios.post(`${API_URL}/users/${testUserId}/pin`,
            { is_pinned: true },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('PASS: User pinned.');
    } catch (e) {
        console.error('FAIL: Pinning User', e.response?.data || e.message);
    }

    // 3. Verify Sorting in Public List
    try {
        console.log('\n[TEST] Verifying "We" List Sorting...');
        const listRes = await axios.get(`${API_URL}/users/public/list`);
        const users = listRes.data.links || [];
        if (users.length > 0) {
            // Pinned users should be at top (pinned_at is not null)
            // Maintainer next?
            // We can inspect the order.
            console.log('Top 3 users:', users.slice(0, 3).map((u: any) => `${u.name} (Pinned: ${u.pinned_at ? 'Yes' : 'No'})`));
        }
    } catch (e) {
        console.error('FAIL: Public List', e.message);
    }

    // 4. Test Collection
    try {
        console.log('\n[TEST] Collection Flow...');
        const diaryId = 1; // Assuming diary 1 exists

        // Check Status
        const statusRes = await axios.get(`${API_URL}/collects/${diaryId}/collect-status`, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log(`Current Status: ${statusRes.data.isCollected}`);

        // Collect
        if (!statusRes.data.isCollected) {
            await axios.post(`${API_URL}/collects/${diaryId}/collect`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log('PASS: Diary collected.');
        } else {
            await axios.delete(`${API_URL}/collects/${diaryId}/collect`, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log('PASS: Diary uncollected (was already collected).');
        }
    } catch (e) {
        console.error('FAIL: Collection', e.message);
    }
}

runTests();
