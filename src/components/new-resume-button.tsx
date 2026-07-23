"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createResume } from "@/lib/actions";

export function NewResumeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-primary"
      disabled={pending}
      onClick={() => start(async () => { const { id } = await createResume({}); router.push(`/career/resume/${id}`); })}
    >
      <Plus size={16} /> New resume
    </button>
  );
}
