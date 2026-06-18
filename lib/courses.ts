// Platz-Definitionen (Par + Stroke-Index je Loch, Abschläge mit CR/Slope).
// Reine Daten + Helfer; im Store als Collection "courses" editierbar.

export interface CourseTee {
  id: string;
  label: string;
  cr: number; // Course Rating
  slope: number; // Slope
}

export interface CourseHole {
  hole: number; // 1..18
  par: number; // 3 | 4 | 5
  si: number; // Stroke-Index 1..18, eindeutig
}

export interface Course {
  id: string;
  name: string;
  par: number; // Summe der Loch-Pars
  holes: CourseHole[];
  tees: CourseTee[];
}

// Quelle: Scorecard-DB (golftraxx via 18birdies). Vom Nutzer zu verifizieren.
export const ULLERSDORF: Course = {
  id: "ullersdorf",
  name: "Golf Dresden Ullersdorf",
  par: 73,
  holes: [
    { hole: 1, par: 4, si: 9 },
    { hole: 2, par: 3, si: 13 },
    { hole: 3, par: 4, si: 17 },
    { hole: 4, par: 4, si: 15 },
    { hole: 5, par: 5, si: 1 },
    { hole: 6, par: 4, si: 3 },
    { hole: 7, par: 3, si: 5 },
    { hole: 8, par: 4, si: 7 },
    { hole: 9, par: 5, si: 11 },
    { hole: 10, par: 4, si: 6 },
    { hole: 11, par: 4, si: 10 },
    { hole: 12, par: 3, si: 18 },
    { hole: 13, par: 5, si: 8 },
    { hole: 14, par: 4, si: 16 },
    { hole: 15, par: 4, si: 2 },
    { hole: 16, par: 4, si: 4 },
    { hole: 17, par: 4, si: 14 },
    { hole: 18, par: 5, si: 12 },
  ],
  tees: [{ id: "schwarz", label: "Schwarz", cr: 70.7, slope: 121 }],
};

export const COURSES: Course[] = [ULLERSDORF];

export function courseById(courses: Course[], id?: string): Course | undefined {
  return id ? courses.find((c) => c.id === id) : undefined;
}

export function teeById(
  course: Course | undefined,
  id?: string
): CourseTee | undefined {
  if (!course) return undefined;
  return id
    ? course.tees.find((t) => t.id === id)
    : course.tees[0];
}
