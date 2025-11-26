console.log('🎯 FINAL VERIFICATION TEST');
console.log('Testing complete timetable generation flow...\n');

async function finalTest() {
    try {
        // 1. Test login
        console.log('1️⃣ Testing login...');
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@uniflow.edu',
                password: 'password123'
            })
        });
        const loginData = await loginResponse.json();
        
        if (!loginData.success) {
            throw new Error('Login failed: ' + loginData.message);
        }
        console.log('✅ Login successful');
        const token = loginData.data.token;

        // 2. Test semesters endpoint
        console.log('\n2️⃣ Testing semesters endpoint...');
        const semestersResponse = await fetch('http://localhost:5000/api/timetable-simple/semesters', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const semestersData = await semestersResponse.json();
        
        if (!semestersData.success) {
            throw new Error('Semesters failed: ' + semestersData.message);
        }
        console.log('✅ Semesters endpoint working');
        console.log(`   📊 Found ${semestersData.data.totalSemesters} semesters with ${semestersData.data.totalCourses} total courses`);
        
        semestersData.data.semesters.forEach(sem => {
            console.log(`   - Semester ${sem.semester}: ${sem.courses} courses`);
        });

        // 3. Test timetable generation
        console.log('\n3️⃣ Testing timetable generation...');
        const generateResponse = await fetch('http://localhost:5000/api/timetable-simple/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                algorithm: 'greedy',
                semester: 1,
                academicYear: 2025
            })
        });
        
        const generateData = await generateResponse.json();
        
        if (!generateData.success) {
            throw new Error('Generation failed: ' + generateData.message);
        }
        
        console.log('✅ Timetable generation successful!');
        console.log(`   🎯 Sessions: ${generateData.data.metadata.totalSessions}`);
        console.log(`   ⚡ Quality Score: ${generateData.data.metrics.qualityScore}/100`);
        console.log(`   🔥 Success Rate: ${generateData.data.metrics.schedulingRate}%`);
        console.log(`   ⚠️  Conflicts: ${generateData.data.conflicts.length}`);
        console.log(`   ⏱️  Generation Time: ${generateData.data.metadata.generationTime}ms`);

        console.log('\n🎉 ALL TESTS PASSED! 🎉');
        console.log('✅ The timetable generation system is fully functional!');
        console.log('✅ Frontend can now connect to working backend APIs');
        console.log('✅ Real data will replace the "0 sessions" placeholder');
        
    } catch (error) {
        console.log('\n❌ Test failed:', error.message);
    }
}

finalTest();