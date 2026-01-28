
const BASE_URL = 'http://localhost:3001/api';
const credentials = {
    emailOrUsername: '羚羊',
    password: 'admin123'
};

async function runTest() {
    try {
        console.log('--- 1. Testing Login ---');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!loginRes.ok) {
            const errData = await loginRes.json();
            throw new Error(`Login Failed: ${loginRes.status} ${JSON.stringify(errData)}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login Success! Token obtained.');

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        console.log('\n--- 2. Testing Create Diary ---');
        const diaryData = {
            title: 'API Test Diary ' + new Date().toLocaleString(),
            content: 'This is a test diary created by AI script. **Markdown** is supported.',
            is_pinned: 1
        };
        const diaryRes = await fetch(`${BASE_URL}/diaries`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(diaryData)
        });

        if (!diaryRes.ok) {
            const errData = await diaryRes.json();
            throw new Error(`Create Diary Failed: ${diaryRes.status} ${JSON.stringify(errData)}`);
        }

        const diaryInfo = await diaryRes.json();
        const diaryId = diaryInfo.id;
        console.log(`Diary Created! ID: ${diaryId}`);

        console.log('\n--- 3. Testing Add Comment ---');
        const commentData = {
            diary_id: diaryId,
            author: 'AI Tester',
            content: 'Great post! This is an automated comment.'
        };
        const commentRes = await fetch(`${BASE_URL}/comments`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(commentData)
        });

        if (!commentRes.ok) {
            const errData = await commentRes.json();
            throw new Error(`Add Comment Failed: ${commentRes.status} ${JSON.stringify(errData)}`);
        }

        const commentInfo = await commentRes.json();
        console.log(`Comment Added! ID: ${commentInfo.id}`);

        console.log('\n--- 4. Testing Get Diary List ---');
        const listRes = await fetch(`${BASE_URL}/diaries`);
        if (!listRes.ok) throw new Error(`Get List Failed: ${listRes.status}`);
        const listData = await listRes.json();
        console.log(`Found ${listData.length} diaries.`);

        console.log('\n--- 5. Testing Issues (Q&A) API ---');
        // 5a. Create Issue
        const issueData = {
            title: 'Test Issue ' + Date.now(),
            content: 'This is a test issue from automated script.'
        };
        const issueRes = await fetch(`${BASE_URL}/issues`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(issueData)
        });
        if (!issueRes.ok) throw new Error(`Create Issue Failed: ${issueRes.status}`);
        const issueInfo = await issueRes.json();
        console.log(`Issue Created! ID: ${issueInfo.id}`);

        // 5b. Get Issues
        const issuesListRes = await fetch(`${BASE_URL}/issues`, { headers: authHeaders });
        if (!issuesListRes.ok) throw new Error(`Get Issues List Failed: ${issuesListRes.status}`);
        const issuesList = await issuesListRes.json();
        console.log(`Found ${issuesList.length} issues.`);

        // 5c. Reply Issue (as admin)
        const replyRes = await fetch(`${BASE_URL}/issues/${issueInfo.id}/reply`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ reply_content: 'This is a test reply by Admin.' })
        });
        if (!replyRes.ok) throw new Error(`Reply Issue Failed: ${replyRes.status}`);
        console.log('Reply Issue Success!');

        console.log('\n--- ALL API TESTS PASSED! ---');
    } catch (error) {
        console.error('Test Failed!');
        console.error(error.message);
        process.exit(1);
    }
}

runTest();
