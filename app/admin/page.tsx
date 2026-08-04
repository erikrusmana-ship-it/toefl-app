"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [section, setSection] = useState<string>("Structure");
  const [questionText, setQuestionText] = useState<string>("");
  const [optionA, setOptionA] = useState<string>("");
  const [optionB, setOptionB] = useState<string>("");
  const [optionC, setOptionC] = useState<string>("");
  const [optionD, setOptionD] = useState<string>("");
  const [correctAnswer, setCorrectAnswer] = useState<string>("A");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrlInput, setAudioUrlInput] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let finalAudioUrl = audioUrlInput.trim();

      // 1. Upload File Audio jika pengguna memilih file lokal
      if (audioFile) {
        const fileExt = audioFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `audios/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("toefl-audios")
          .upload(filePath, audioFile);

        if (uploadError) {
          throw new Error(`Gagal upload audio: ${uploadError.message}. Pastikan Policy Storage di Supabase sudah diizinkan.`);
        }

        // Ambil URL publik dari file yang berhasil diupload
        const { data: publicUrlData } = supabase.storage
          .from("toefl-audios")
          .getPublicUrl(filePath);

        finalAudioUrl = publicUrlData.publicUrl;
      }

      // 2. Simpan Data Soal ke Tabel 'questions'
      const { error: insertError } = await supabase.from("questions").insert([
        {
          section,
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctAnswer,
          audio_url: finalAudioUrl || null,
        },
      ]);

      if (insertError) {
        throw new Error(`Gagal menyimpan soal: ${insertError.message}`);
      }

      setMessage({ text: "✅ Soal TOEFL baru berhasil ditambahkan!", isError: false });

      // Reset Formulir
      setQuestionText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("A");
      setAudioFile(null);
      setAudioUrlInput("");
    } catch (err: any) {
      setMessage({ text: `❌ ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Kembali ke Halaman Tes
          </Link>
          <span className="text-xs bg-gray-200 text-gray-700 font-bold px-3 py-1 rounded-full">
            Admin Panel
          </span>
        </div>

        {/* Header Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Form Input Soal TOEFL</h1>
          <p className="text-sm text-gray-500 mt-1">
            Isi formulir di bawah ini untuk menambahkan soal baru ke database Supabase.
          </p>
        </div>

        {/* Notifikasi Pesan */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold ${
              message.isError
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form Tambah Soal */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          
          {/* Kategori Section */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kategori / Section Soal:
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="Structure">Structure & Written Expression</option>
              <option value="Listening">Listening Comprehension</option>
              <option value="Reading">Reading Comprehension</option>
            </select>
          </div>

          {/* Teks Soal */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Pertanyaan / Teks Soal:
            </label>
            <textarea
              required
              rows={3}
              placeholder="Masukkan teks soal..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Upload Audio (Khusus Listening) */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
            <label className="block text-xs font-bold text-blue-900">
              🎧 Audio MP3 (Opsional untuk Listening):
            </label>
            
            {/* Opsi Upload File */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Opsi A: Upload file MP3 langsung</p>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>

            <div className="text-center text-xs text-gray-400 font-bold">atau</div>

            {/* Opsi Tempel URL */}
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Opsi B: Tempel URL Audio publik</p>
              <input
                type="url"
                placeholder="https://example.com/audio.mp3"
                value={audioUrlInput}
                onChange={(e) => setAudioUrlInput(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pilihan Jawaban (A, B, C, D) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan A:</label>
              <input
                type="text"
                required
                placeholder="Jawaban A"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan B:</label>
              <input
                type="text"
                required
                placeholder="Jawaban B"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan C:</label>
              <input
                type="text"
                required
                placeholder="Jawaban C"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan D:</label>
              <input
                type="text"
                required
                placeholder="Jawaban D"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Kunci Jawaban */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kunci Jawaban Benar:
            </label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full p-2.5 text-sm border rounded-lg font-bold text-green-700 bg-green-50 border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="A">Jawaban A</option>
              <option value="B">Jawaban B</option>
              <option value="C">Jawaban C</option>
              <option value="D">Jawaban D</option>
            </select>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:bg-blue-300 mt-4"
          >
            {loading ? "💾 Menyimpan Soal..." : "➕ Tambahkan Soal ke Database"}
          </button>
        </form>

      </div>
    </main>
  );
}