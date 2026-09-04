"use client";

import {
  adminAllowParticipant,
  adminExpelParticipant,
} from "./actions";

type DecisionFormProps = {
  id: number;
};

export function AllowForm({
  id,
}: DecisionFormProps) {
  return (
    <form action={adminAllowParticipant}>
      <input type="hidden" name="id" value={id} />

      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
      >
        Izinkan
      </button>
    </form>
  );
}

export function ExpelForm({
  id,
}: DecisionFormProps) {
  return (
    <form action={adminExpelParticipant}>
      <input type="hidden" name="id" value={id} />

      <button
        type="submit"
        className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
      >
        Keluarkan
      </button>
    </form>
  );
}