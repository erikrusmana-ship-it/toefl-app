"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Question {
  id: number;
  section: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  audio_url?: string | null;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  
  const DURATION_IN_SECONDS = 120;
  const [timeLeft, setTimeLeft] = useState<number>(DURATION_IN_SECONDS);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        setQuestions(data || []);
      } catch (err: any) {
        console.error("Gagal mengambil soal:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  useEffect(() => {
    if (loading || isSubmitted || questions.length === 0) return;

    if (timeLeft <= 0) {
      alert("⏰ Waktu habis! Jawaban Anda otomatis dikumpulkan.");
      processSubmit();
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, loading, isSubmitted, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (questionId: number, answer: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleManualSubmit = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      if (!confirm("Masih ada soal yang belum dijawab. Yakin ingin mengumpulkan?")) {
        return;
      }
    }
    processSubmit();
  };

  const processSubmit = async () => {
    if (isSubmitted) return;

    let correct = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correct += 1;
      }
    });

    const calculatedScore = Math.round(310 + (correct / (questions.length || 1)) * 367);
    
    setCorrectCount(correct);
    setFinalScore(calculatedScore);
    setIsSubmitted(true);
    setIsSaving(true);

    try {
      const { error } = await supabase.from("test_scores").insert([
        {
          user_name: userName.trim() || "Peserta Anonim",
          total_questions: questions.length,
          correct_answers: correct,
          score: calculatedScore,
        },
      ]);

      if (error) throw error;
    } catch (err: any) {
      alert(`Gagal menyimpan skor ke database: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header & Sticky Timer */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-4 z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Simulasi Tes TOEFL</h1>
              <p className="text-xs text-gray-500">Pilih jawaban dan pantau sisa waktu Anda.</p>
            </div>

            {!loading && !isSubmitted && (
              <div
                className={`px-4 py-2 rounded-xl border text-center font-mono font-bold transition-all ${
                  timeLeft <= 30
                    ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider font-sans text-gray-500">Sisa Waktu</p>
                <p className="text-xl">{formatTime(timeLeft)}</p>
              </div>
            )}
          </div>
          
          {!isSubmitted && (
            <div className="mt-4 pt-3 border-t">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nama Peserta:
              </label>
              <input
                type="text"
                placeholder="Masukkan nama Anda..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-white p-6 rounded-xl text-center text-blue-600 font-medium border shadow-sm">
            ⏳ Memuat soal tes...
          </div>
        )}

        {/* Hasil Skor */}
        {isSubmitted && (
          <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md space-y-2">
            <h2 className="text-lg font-bold">🎉 Tes Selesai!</h2>
            <p className="text-sm">
              Peserta: <strong>{userName || "Peserta Anonim"}</strong>
            </p>
            <div className="flex gap-4 pt-2">
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <p className="text-xs text-blue-100">Jawaban Benar</p>
                <p className="text-xl font-extrabold">{correctCount} / {questions.length}</p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <p className="text-xs text-blue-100">Perkiraan Skor TOEFL</p>
                <p className="text-xl font-extrabold">{finalScore}</p>
              </div>
            </div>
            {isSaving ? (
              <p className="text-xs text-blue-200 pt-2 animate-pulse">💾 Menyimpan skor ke cloud Supabase...</p>
            ) : (
              <p className="text-xs text-green-200 pt-2">✓ Skor berhasil tersimpan ke database!</p>
            )}
          </div>
        )}

        {/* Daftar Soal */}
        {!loading && questions.map((q, index) => (
          <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                Soal #{index + 1} ({q.section})
              </span>
              {isSubmitted && (
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  selectedAnswers[q.id] === q.correct_answer 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {selectedAnswers[q.id] === q.correct_answer ? "Benar" : "Salah"}
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-gray-800">{q.question_text}</p>

            {/* Pemutar Audio */}
            {q.audio_url && (
              <div className="my-3 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-1">
                <p className="text-xs font-semibold text-blue-800">🎧 Dengarkan Audio Berikut:</p>
                <audio 
                  controls 
                  src={q.audio_url} 
                  className="w-full h-10 rounded" 
                  controlsList="nodownload"
                >
                  Browser Anda tidak mendukung pemutar audio.
                </audio>
              </div>
            )}

            {/* Pilihan Jawaban */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              {[
                { key: "A", val: q.option_a },
                { key: "B", val: q.option_b },
                { key: "C", val: q.option_c },
                { key: "D", val: q.option_d },
              ].map((opt) => {
                const isSelected = selectedAnswers[q.id] === opt.key;
                let btnStyle = "bg-gray-50 border-gray-200 hover:bg-blue-50 text-gray-700";

                if (isSelected) {
                  btnStyle = "bg-blue-600 text-white border-blue-600";
                }

                if (isSubmitted) {
                  if (opt.key === q.correct_answer) {
                    btnStyle = "bg-green-600 text-white border-green-600";
                  } else if (isSelected && opt.key !== q.correct_answer) {
                    btnStyle = "bg-red-500 text-white border-red-500";
                  }
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isSubmitted}
                    onClick={() => handleSelectAnswer(q.id, opt.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>
                      <strong className="mr-2">{opt.key}.</strong> {opt.val}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Tombol Submit */}
        {!loading && !isSubmitted && questions.length > 0 && (
          <button
            onClick={handleManualSubmit}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
          >
            Selesai & Hitung Skor
          </button>
        )}

      </div>
    </main>
  );
}