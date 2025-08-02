import pdf from 'pdf-parse/lib/pdf-parse.js';

interface ExtractedSubject {
  name: string;
  code?: string;
  lectureHours: number;
  labHours: number;
  isLab: boolean;
  credits?: number;
}

export class SyllabusExtractor {
  
  /**
   * Extract subjects from syllabus PDF buffer
   */
  public async extractSubjects(pdfBuffer: Buffer): Promise<ExtractedSubject[]> {
    try {
      console.log('Extracting text from PDF...');
      const data = await pdf(pdfBuffer);
      const text = data.text;
      
      console.log('PDF text extracted, length:', text.length);
      
      return this.parseSubjects(text);
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw new Error('Failed to extract subjects from PDF');
    }
  }

  /**
   * Parse subjects from extracted text using pattern matching
   */
  private parseSubjects(text: string): ExtractedSubject[] {
    const subjects: ExtractedSubject[] = [];
    
    // Clean and normalize the text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Common patterns for subject information in syllabus PDFs
    const patterns = [
      // Pattern 1: "Subject Name (Code) - L T P Credits" format
      /([A-Za-z\s&,()-]+?)\s*\(?([A-Z]{2,4}[0-9]{2,4})\)?\s*[-–]\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g,
      
      // Pattern 2: "Code Subject Name L-T-P Credits" format
      /([A-Z]{2,4}[0-9]{2,4})\s+([A-Za-z\s&,()-]+?)\s+(\d+)-(\d+)-(\d+)\s+(\d+)/g,
      
      // Pattern 3: Table format with subjects and hours
      /(?:^|\n)\s*([A-Za-z\s&,()-]{10,50})\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(\d+))?/gm,
      
      // Pattern 4: Simple "Subject Name: L hours, P hours" format
      /([A-Za-z\s&,()-]{5,40}):\s*(?:L[ecture]*\s*)?(\d+)\s*(?:hours?|hrs?)?,?\s*(?:P[ractical]*\s*)?(\d+)\s*(?:hours?|hrs?)?/gi
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const matches = [...cleanText.matchAll(pattern)];
      
      for (const match of matches) {
        let subject: ExtractedSubject | null = null;
        
        try {
          if (pattern === patterns[0]) {
            // Pattern 1: Name (Code) - L T P Credits
            subject = {
              name: this.cleanSubjectName(match[1]),
              code: match[2],
              lectureHours: parseInt(match[3]) || 0,
              labHours: parseInt(match[5]) || 0, // P for practical
              isLab: (parseInt(match[5]) || 0) > 0,
              credits: parseInt(match[6]) || 0
            };
          } else if (pattern === patterns[1]) {
            // Pattern 2: Code Name L-T-P Credits
            subject = {
              name: this.cleanSubjectName(match[2]),
              code: match[1],
              lectureHours: parseInt(match[3]) || 0,
              labHours: parseInt(match[5]) || 0,
              isLab: (parseInt(match[5]) || 0) > 0,
              credits: parseInt(match[6]) || 0
            };
          } else if (pattern === patterns[2]) {
            // Pattern 3: Table format
            subject = {
              name: this.cleanSubjectName(match[1]),
              lectureHours: parseInt(match[2]) || 0,
              labHours: parseInt(match[4]) || 0,
              isLab: (parseInt(match[4]) || 0) > 0,
              credits: parseInt(match[5]) || 0
            };
          } else if (pattern === patterns[3]) {
            // Pattern 4: Simple format
            subject = {
              name: this.cleanSubjectName(match[1]),
              lectureHours: parseInt(match[2]) || 0,
              labHours: parseInt(match[3]) || 0,
              isLab: (parseInt(match[3]) || 0) > 0
            };
          }
          
          if (subject && this.isValidSubject(subject)) {
            // Check for duplicates
            const isDuplicate = subjects.some(s => 
              s.name.toLowerCase() === subject!.name.toLowerCase() ||
              (s.code && subject!.code && s.code === subject!.code)
            );
            
            if (!isDuplicate) {
              subjects.push(subject);
            }
          }
        } catch (error) {
          console.warn('Error parsing subject:', error);
          continue;
        }
      }
    }

    // If no subjects found with patterns, try fallback extraction
    if (subjects.length === 0) {
      console.log('No subjects found with patterns, trying fallback extraction...');
      return this.fallbackExtraction(cleanText);
    }

    console.log(`Extracted ${subjects.length} subjects from PDF`);
    return subjects.slice(0, 20); // Limit to reasonable number
  }

  /**
   * Fallback method when patterns don't work
   */
  private fallbackExtraction(text: string): ExtractedSubject[] {
    const subjects: ExtractedSubject[] = [];
    
    // Look for common subject keywords and create default subjects
    const commonSubjects = [
      'Data Structures', 'Algorithm Design', 'Database Systems', 'Computer Networks',
      'Operating Systems', 'Software Engineering', 'Web Technology', 'Mobile Computing',
      'Artificial Intelligence', 'Machine Learning', 'Computer Graphics', 'System Programming',
      'Theory of Computation', 'Compiler Design', 'Network Security', 'Cloud Computing',
      'Calculus', 'Linear Algebra', 'Statistics', 'Discrete Mathematics',
      'Physics', 'Chemistry', 'Electronics', 'Digital Logic'
    ];

    const textLower = text.toLowerCase();
    
    for (const subjectName of commonSubjects) {
      if (textLower.includes(subjectName.toLowerCase())) {
        // Assign default hours based on subject type
        const isLabSubject = subjectName.includes('Lab') || 
                           subjectName.includes('Programming') ||
                           subjectName.includes('Graphics') ||
                           subjectName.includes('Web Technology');
        
        subjects.push({
          name: subjectName,
          lectureHours: isLabSubject ? 2 : 3,
          labHours: isLabSubject ? 2 : 0,
          isLab: isLabSubject,
          credits: isLabSubject ? 3 : 4
        });
      }
    }

    return subjects.slice(0, 8); // Reasonable number for fallback
  }

  /**
   * Clean and normalize subject names
   */
  private cleanSubjectName(name: string): string {
    return name
      .trim()
      .replace(/^\d+\.?\s*/, '') // Remove leading numbers
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/^[-–]\s*/, '') // Remove leading dashes
      .trim();
  }

  /**
   * Validate if extracted subject data makes sense
   */
  private isValidSubject(subject: ExtractedSubject): boolean {
    // Subject name should be reasonable length and contain letters
    if (!subject.name || subject.name.length < 3 || subject.name.length > 100) {
      return false;
    }
    
    if (!/[a-zA-Z]/.test(subject.name)) {
      return false;
    }
    
    // Hours should be reasonable
    if (subject.lectureHours < 0 || subject.lectureHours > 10) {
      return false;
    }
    
    if (subject.labHours < 0 || subject.labHours > 10) {
      return false;
    }
    
    // Should have at least some hours
    if (subject.lectureHours === 0 && subject.labHours === 0) {
      return false;
    }
    
    // Filter out common non-subject text
    const excludePatterns = [
      /^(university|college|department|semester|year|course|credit|total|page|syllabus)/i,
      /^(table|figure|chapter|section|unit|module)/i,
      /^\d+$/,
      /^[^a-zA-Z]*$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(subject.name)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create sample subjects for demonstration when PDF extraction fails
   */
  public createSampleSubjects(department: string, year: string): ExtractedSubject[] {
    const sampleSubjects: { [key: string]: ExtractedSubject[] } = {
      'Computer Science': [
        { name: 'Data Structures and Algorithms', lectureHours: 3, labHours: 2, isLab: false },
        { name: 'Database Management Systems', lectureHours: 3, labHours: 2, isLab: false },
        { name: 'Computer Networks', lectureHours: 3, labHours: 1, isLab: false },
        { name: 'Software Engineering', lectureHours: 3, labHours: 0, isLab: false },
        { name: 'Web Technology Lab', lectureHours: 0, labHours: 4, isLab: true },
        { name: 'Operating Systems', lectureHours: 3, labHours: 1, isLab: false }
      ],
      'Mathematics': [
        { name: 'Calculus III', lectureHours: 4, labHours: 0, isLab: false },
        { name: 'Linear Algebra', lectureHours: 3, labHours: 1, isLab: false },
        { name: 'Statistics and Probability', lectureHours: 3, labHours: 1, isLab: false },
        { name: 'Numerical Methods', lectureHours: 3, labHours: 2, isLab: false },
        { name: 'Mathematical Modeling', lectureHours: 2, labHours: 2, isLab: false }
      ]
    };

    return sampleSubjects[department] || sampleSubjects['Computer Science'];
  }
}

export default SyllabusExtractor;