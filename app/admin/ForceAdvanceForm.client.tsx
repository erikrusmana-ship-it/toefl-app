"use client";

import { forceAdvanceParticipant } from "./actions";

type ForceAdvanceFormProps = {
  id: number;
};

export default function ForceAdvanceForm({
  id,
}: ForceAdvanceFormProps) {
  return (
    <form action={forceAdvanceParticipant}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="next" />

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
      >
        Paksa Lanjut
      </button>
    </form>
  );
}