// Genetic Algorithm for Automated Timetable Generation

interface Subject {
  id: string;
  name: string;
  lectureHours: number;
  labHours: number;
  isLab: boolean;
  teacherId?: string;
}

interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'auditorium';
  capacity: number;
}

interface Teacher {
  id: string;
  name: string;
  isAvailable: boolean;
  maxHours: number;
}

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
}

interface ClassAssignment {
  subjectId: string;
  teacherId?: string;
  roomId: string;
  timeSlot: TimeSlot;
  isLab: boolean;
}

interface Chromosome {
  assignments: ClassAssignment[];
  fitness: number;
}

interface GAParams {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
}

export class TimetableGA {
  private subjects: Subject[];
  private rooms: Room[];
  private teachers: Teacher[];
  private timeSlots: TimeSlot[];
  private params: GAParams;

  constructor(
    subjects: Subject[],
    rooms: Room[],
    teachers: Teacher[],
    params: Partial<GAParams> = {}
  ) {
    this.subjects = subjects;
    this.rooms = rooms;
    this.teachers = teachers;
    this.timeSlots = this.generateTimeSlots();
    this.params = {
      populationSize: 50,
      generations: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.2,
      ...params
    };
  }

  private generateTimeSlots(): TimeSlot[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = [
      { start: '09:00', end: '10:30' },
      { start: '11:00', end: '12:30' },
      { start: '14:00', end: '15:30' },
      { start: '16:00', end: '17:30' }
    ];

    const slots: TimeSlot[] = [];
    let slotIndex = 0;

    for (const day of days) {
      for (const time of times) {
        slots.push({
          day,
          startTime: time.start,
          endTime: time.end,
          slotIndex: slotIndex++
        });
      }
    }

    return slots;
  }

  private createRandomChromosome(): Chromosome {
    const assignments: ClassAssignment[] = [];
    
    for (const subject of this.subjects) {
      const totalHours = subject.lectureHours + subject.labHours;
      
      for (let hour = 0; hour < totalHours; hour++) {
        const isThisLab = subject.isLab || (subject.labHours > 0 && hour >= subject.lectureHours);
        
        // Find suitable rooms
        const suitableRooms = this.rooms.filter(room => 
          isThisLab ? room.type === 'lab' : room.type === 'classroom'
        );
        
        if (suitableRooms.length === 0) continue;
        
        const randomRoom = suitableRooms[Math.floor(Math.random() * suitableRooms.length)];
        const randomTimeSlot = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];
        
        assignments.push({
          subjectId: subject.id,
          teacherId: subject.teacherId,
          roomId: randomRoom.id,
          timeSlot: randomTimeSlot,
          isLab: isThisLab
        });
      }
    }

    return {
      assignments,
      fitness: this.calculateFitness({ assignments, fitness: 0 })
    };
  }

  private calculateFitness(chromosome: Chromosome): number {
    let fitness = 1000; // Start with perfect score
    const { assignments } = chromosome;

    // Penalty for room conflicts (same room, same time)
    const roomTimeMap = new Map<string, Set<number>>();
    for (const assignment of assignments) {
      const key = assignment.roomId;
      if (!roomTimeMap.has(key)) {
        roomTimeMap.set(key, new Set());
      }
      
      const timeSlots = roomTimeMap.get(key)!;
      if (timeSlots.has(assignment.timeSlot.slotIndex)) {
        fitness -= 50; // Heavy penalty for room conflicts
      } else {
        timeSlots.add(assignment.timeSlot.slotIndex);
      }
    }

    // Penalty for teacher conflicts (same teacher, same time)
    const teacherTimeMap = new Map<string, Set<number>>();
    for (const assignment of assignments) {
      if (!assignment.teacherId) continue;
      
      const key = assignment.teacherId;
      if (!teacherTimeMap.has(key)) {
        teacherTimeMap.set(key, new Set());
      }
      
      const timeSlots = teacherTimeMap.get(key)!;
      if (timeSlots.has(assignment.timeSlot.slotIndex)) {
        fitness -= 40; // Heavy penalty for teacher conflicts
      } else {
        timeSlots.add(assignment.timeSlot.slotIndex);
      }
    }

    // Bonus for consecutive lab sessions
    const labSessions = assignments.filter(a => a.isLab);
    for (let i = 0; i < labSessions.length - 1; i++) {
      const current = labSessions[i];
      const next = labSessions[i + 1];
      
      if (current.subjectId === next.subjectId &&
          current.timeSlot.day === next.timeSlot.day &&
          current.timeSlot.slotIndex + 1 === next.timeSlot.slotIndex) {
        fitness += 20; // Bonus for consecutive lab slots
      }
    }

    // Penalty for teacher overload
    const teacherHours = new Map<string, number>();
    for (const assignment of assignments) {
      if (!assignment.teacherId) continue;
      
      const current = teacherHours.get(assignment.teacherId) || 0;
      teacherHours.set(assignment.teacherId, current + 1);
    }

    for (const [teacherId, hours] of teacherHours) {
      const teacher = this.teachers.find(t => t.id === teacherId);
      if (teacher && hours > teacher.maxHours) {
        fitness -= (hours - teacher.maxHours) * 10; // Penalty for exceeding max hours
      }
    }

    // Penalty for unavailable teachers
    for (const assignment of assignments) {
      if (!assignment.teacherId) continue;
      
      const teacher = this.teachers.find(t => t.id === assignment.teacherId);
      if (teacher && !teacher.isAvailable) {
        fitness -= 30; // Penalty for using unavailable teachers
      }
    }

    return Math.max(0, fitness);
  }

  private crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    if (Math.random() > this.params.crossoverRate) {
      return [parent1, parent2];
    }

    const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.assignments.length, parent2.assignments.length));
    
    const child1Assignments = [
      ...parent1.assignments.slice(0, crossoverPoint),
      ...parent2.assignments.slice(crossoverPoint)
    ];
    
    const child2Assignments = [
      ...parent2.assignments.slice(0, crossoverPoint),
      ...parent1.assignments.slice(crossoverPoint)
    ];

    const child1: Chromosome = {
      assignments: child1Assignments,
      fitness: this.calculateFitness({ assignments: child1Assignments, fitness: 0 })
    };

    const child2: Chromosome = {
      assignments: child2Assignments,
      fitness: this.calculateFitness({ assignments: child2Assignments, fitness: 0 })
    };

    return [child1, child2];
  }

  private mutate(chromosome: Chromosome): Chromosome {
    const mutatedAssignments = [...chromosome.assignments];
    
    for (let i = 0; i < mutatedAssignments.length; i++) {
      if (Math.random() < this.params.mutationRate) {
        const assignment = mutatedAssignments[i];
        
        // Random mutation: change room or time slot
        if (Math.random() < 0.5) {
          // Change room
          const suitableRooms = this.rooms.filter(room => 
            assignment.isLab ? room.type === 'lab' : room.type === 'classroom'
          );
          if (suitableRooms.length > 0) {
            assignment.roomId = suitableRooms[Math.floor(Math.random() * suitableRooms.length)].id;
          }
        } else {
          // Change time slot
          assignment.timeSlot = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];
        }
      }
    }

    return {
      assignments: mutatedAssignments,
      fitness: this.calculateFitness({ assignments: mutatedAssignments, fitness: 0 })
    };
  }

  private selectParents(population: Chromosome[]): [Chromosome, Chromosome] {
    // Tournament selection
    const tournamentSize = 3;
    
    const selectOne = () => {
      const tournament = [];
      for (let i = 0; i < tournamentSize; i++) {
        tournament.push(population[Math.floor(Math.random() * population.length)]);
      }
      return tournament.reduce((best, current) => current.fitness > best.fitness ? current : best);
    };

    return [selectOne(), selectOne()];
  }

  public generateTimetable(): { 
    bestTimetable: ClassAssignment[]; 
    fitnessScore: number; 
    generationData: any[] 
  } {
    console.log('Starting Genetic Algorithm for timetable generation...');
    
    // Initialize population
    let population: Chromosome[] = [];
    for (let i = 0; i < this.params.populationSize; i++) {
      population.push(this.createRandomChromosome());
    }

    const generationData: any[] = [];
    let bestOverall: Chromosome = population[0];

    // Evolution loop
    for (let generation = 0; generation < this.params.generations; generation++) {
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);
      
      // Track best
      if (population[0].fitness > bestOverall.fitness) {
        bestOverall = { ...population[0] };
      }

      // Store generation stats
      generationData.push({
        generation,
        bestFitness: population[0].fitness,
        avgFitness: population.reduce((sum, chr) => sum + chr.fitness, 0) / population.length,
        worstFitness: population[population.length - 1].fitness
      });

      console.log(`Generation ${generation}: Best fitness = ${population[0].fitness}`);

      // Create next generation
      const newPopulation: Chromosome[] = [];
      
      // Elitism: Keep best chromosomes
      const eliteCount = Math.floor(this.params.populationSize * this.params.elitismRate);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ ...population[i] });
      }

      // Generate offspring
      while (newPopulation.length < this.params.populationSize) {
        const [parent1, parent2] = this.selectParents(population);
        const [child1, child2] = this.crossover(parent1, parent2);
        
        newPopulation.push(this.mutate(child1));
        if (newPopulation.length < this.params.populationSize) {
          newPopulation.push(this.mutate(child2));
        }
      }

      population = newPopulation;

      // Early termination if perfect solution found
      if (bestOverall.fitness >= 1000) {
        console.log(`Perfect solution found at generation ${generation}!`);
        break;
      }
    }

    console.log(`GA completed. Best fitness: ${bestOverall.fitness}`);

    return {
      bestTimetable: bestOverall.assignments,
      fitnessScore: bestOverall.fitness,
      generationData
    };
  }
}

export default TimetableGA;