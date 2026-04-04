const SchedulingAlgorithm = require('./schedulingAlgorithm');

async function runTest() {
  console.log("Initializing Scheduling Algorithm...");

  // 1. Initialize the algorithm and force it to use 'genetic'
  const scheduler = new SchedulingAlgorithm({
    algorithm: 'genetic',
    maxIterations: 10,       // Kept low for testing
    populationSize: 5,       // Kept low for testing
    timeSlotDuration: 60
  });

  // 2. Provide mock input data to satisfy the validateInput function
  const inputData = {
    courses: [
      { courseCode: 'CS101', credits: 3, department: 'CS' },
      { courseCode: 'CS102', credits: 4, department: 'CS' }
    ],
    teachers: [
      { teacherId: 'T1', name: 'Alice', department: 'CS' },
      { teacherId: 'T2', name: 'Bob', department: 'CS' }
    ],
    rooms: [
      { roomNumber: '101', capacity: 30 },
      { roomNumber: '102', capacity: 40 }
    ]
  };

  // 3. Generate the timetable
  console.log("Generating timetable...");
  try {
    const result = await scheduler.generateTimetable(inputData);
    console.log("\n--- RESULT ---");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error during generation:", error);
  }
}

runTest();