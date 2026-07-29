import { CurriculumBuilder } from "@/components/learn/curriculum-builder";

/** TEMPORARY: visual harness for the AI Curriculum Builder. Delete after review. */
export default function Preview() {
  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <CurriculumBuilder configured />
    </div>
  );
}
