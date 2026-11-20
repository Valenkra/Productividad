/** Materias fijas del rediseño. El color vive como token en globals.css. */
export const SUBJECT_IDS = ["calculo", "quimica", "historia", "ingles"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

export const SUBJECTS: {
  id: SubjectId;
  name: string;
  /** Clases literales (Tailwind no detecta nombres armados dinámicamente). */
  bg: string;
}[] = [
  { id: "calculo", name: "Cálculo", bg: "bg-subject-calculo" },
  { id: "quimica", name: "Química", bg: "bg-subject-quimica" },
  { id: "historia", name: "Historia", bg: "bg-subject-historia" },
  { id: "ingles", name: "Inglés", bg: "bg-subject-ingles" },
];

export function subjectOf(id: SubjectId | null) {
  return SUBJECTS.find((s) => s.id === id) ?? null;
}
