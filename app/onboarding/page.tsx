"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon, { type FitMateIconName } from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type FormData = {
  goal: string;
  experience: string;
  trainingDays: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
};

type FitnessProfile = {
  id?: string;
  user_id: string;
  goal: string;
  experience: string;
  training_days: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
};

const STEPS = [
  { id: "Tujuan", en: "Goal" },
  { id: "Pengalaman", en: "Experience" },
  { id: "Jadwal", en: "Schedule" },
  { id: "Data Tubuh", en: "Body Data" },
];

const GOAL_OPTIONS = [
  {
    icon: "dumbbell" as FitMateIconName,
    value: "Membentuk Otot",
    id: "Membentuk Otot",
    en: "Build Muscle",
    descriptionId: "Bangun otot & kekuatan.",
    descriptionEn: "Build muscle & strength.",
  },
  {
    icon: "activity" as FitMateIconName,
    value: "Mengurangi Lemak",
    id: "Mengurangi Lemak",
    en: "Lose Fat",
    descriptionId: "Turunkan lemak, jaga otot.",
    descriptionEn: "Lose fat, keep muscle.",
  },
  {
    icon: "energy" as FitMateIconName,
    value: "Menambah Kekuatan",
    id: "Menambah Kekuatan",
    en: "Gain Strength",
    descriptionId: "Naikkan kekuatan.",
    descriptionEn: "Build strength.",
  },
  {
    icon: "run" as FitMateIconName,
    value: "Menjaga Kebugaran",
    id: "Menjaga Kebugaran",
    en: "Stay Fit",
    descriptionId: "Lebih fit & sehat.",
    descriptionEn: "Get fitter & healthier.",
  },
];

const EXPERIENCE_OPTIONS = [
  {
    value: "Pemula",
    id: "Pemula",
    en: "Beginner",
    descriptionId:
      "Baru mulai latihan atau kembali setelah lama berhenti.",
    descriptionEn:
      "New to training or returning after a long break.",
  },
  {
    value: "Menengah",
    id: "Menengah",
    en: "Intermediate",
    descriptionId: "Sudah berlatih secara rutin.",
    descriptionEn: "Already training consistently.",
  },
  {
    value: "Berpengalaman",
    id: "Berpengalaman",
    en: "Experienced",
    descriptionId:
      "Sudah berlatih selama beberapa tahun.",
    descriptionEn: "Training consistently for several years.",
  },
];

const TRAINING_DAY_OPTIONS = [2, 3, 4, 5, 6, 7];

export default function OnboardingPage() {
  const router = useRouter();
  const { tr } = useLanguage();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    goal: "",
    experience: "",
    trainingDays: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Get user error:", userError);
          router.replace("/login");
          return;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("fitness_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile loading error:", profileError);

          alert(
            tr(
              `Gagal memuat profil kebugaran: ${profileError.message}`,
              `Failed to load your fitness profile: ${profileError.message}`
            )
          );

          return;
        }

        if (profile && isMounted) {
          setIsEditMode(true);

          setFormData({
            goal: profile.goal ?? "",
            experience: profile.experience ?? "",
            trainingDays: profile.training_days ?? "",
            age:
              profile.age !== null &&
              profile.age !== undefined
                ? String(profile.age)
                : "",
            gender: profile.gender ?? "",
            height:
              profile.height !== null &&
              profile.height !== undefined
                ? String(profile.height)
                : "",
            weight:
              profile.weight !== null &&
              profile.weight !== undefined
                ? String(profile.weight)
                : "",
          });
        } else if (isMounted) {
          setIsEditMode(false);
        }
      } catch (error) {
        console.error(
          "Unexpected profile loading error:",
          error
        );

        alert(
          tr(
            "Terjadi kendala saat memuat profil kebugaran.",
            "Something went wrong while loading your fitness profile."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router, tr]);

  const updateForm = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateBodyData = () => {
    if (
      !formData.age ||
      !formData.gender ||
      !formData.height ||
      !formData.weight
    ) {
      alert(
        tr(
          "Lengkapi seluruh data tubuh terlebih dahulu.",
          "Please complete all your body information."
        )
      );

      return null;
    }

    const age = Number(formData.age);
    const height = Number(formData.height);
    const weight = Number(formData.weight);

    if (
      !Number.isFinite(age) ||
      !Number.isFinite(height) ||
      !Number.isFinite(weight)
    ) {
      alert(
        tr(
          "Masukkan angka yang valid untuk umur, tinggi, dan berat.",
          "Please enter valid numbers for age, height, and weight."
        )
      );

      return null;
    }

    if (age < 13 || age > 100) {
      alert(
        tr(
          "Umur harus antara 13 dan 100 tahun.",
          "Age must be between 13 and 100 years."
        )
      );

      return null;
    }

    if (height < 100 || height > 250) {
      alert(
        tr(
          "Tinggi badan harus antara 100 dan 250 cm.",
          "Height must be between 100 and 250 cm."
        )
      );

      return null;
    }

    if (weight < 30 || weight > 300) {
      alert(
        tr(
          "Berat badan harus antara 30 dan 300 kg.",
          "Weight must be between 30 and 300 kg."
        )
      );

      return null;
    }

    return {
      age,
      height,
      weight,
    };
  };

  const saveProfile = async () => {
    if (!formData.goal) {
      alert(
        tr(
          "Pilih tujuan fitness utama.",
          "Please select your main fitness goal."
        )
      );

      setStep(0);

      return;
    }

    if (!formData.experience) {
      alert(
        tr(
          "Pilih tingkat pengalaman latihan.",
          "Please select your fitness experience."
        )
      );

      setStep(1);

      return;
    }

    if (!formData.trainingDays) {
      alert(
        tr(
          "Pilih berapa hari Anda dapat latihan.",
          "Please select how often you train."
        )
      );

      setStep(2);

      return;
    }

    const bodyData = validateBodyData();

    if (!bodyData) {
      setStep(3);
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        alert(
          tr(
            "Sesi telah berakhir. Silakan login kembali.",
            "Your session has expired. Please log in again."
          )
        );

        router.replace("/login");

        return;
      }

      const {
        data: existingProfile,
        error: existingProfileError,
      } = await supabase
        .from("fitness_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfileError) {
        throw new Error(
          existingProfileError.message
        );
      }

      const isUpdatingProfile =
        Boolean(existingProfile);

      const profileData: FitnessProfile = {
        user_id: user.id,
        goal: formData.goal,
        experience: formData.experience,
        training_days: formData.trainingDays,
        age: bodyData.age,
        gender: formData.gender,
        height: bodyData.height,
        weight: bodyData.weight,
      };

      const {
        error: saveProfileError,
      } = await supabase
        .from("fitness_profiles")
        .upsert(profileData, {
          onConflict: "user_id",
        });

      if (saveProfileError) {
        throw new Error(
          `Failed to save your fitness profile: ${saveProfileError.message}`
        );
      }

      // The plan page regenerates the existing record in place.
      // Keeping the same plan record preserves workout history.
      router.replace(
        `/plan?generate=true&${
          isUpdatingProfile
            ? "updated=true"
            : "new=true"
        }`
      );
    } catch (error) {
      console.error(
        "Save profile error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : tr(
              "Terjadi kendala saat menyimpan profil kebugaran.",
              "Something went wrong while saving your fitness profile."
            )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (isSaving) {
      return;
    }

    if (step === 0) {
      if (!formData.goal) {
        alert(
          tr(
            "Pilih tujuan fitness utama.",
            "Please select your main fitness goal."
          )
        );

        return;
      }

      setStep(1);
      return;
    }

    if (step === 1) {
      if (!formData.experience) {
        alert(
          tr(
            "Pilih tingkat pengalaman latihan.",
            "Please select your fitness experience."
          )
        );

        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.trainingDays) {
        alert(
          tr(
            "Pilih berapa hari Anda dapat latihan.",
            "Please select how often you train."
          )
        );

        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      saveProfile();
    }
  };

  const previousStep = () => {
    if (isSaving) {
      return;
    }

    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="text-center">
          <div className="animate-pulse">
            <FitMateBrand size="lg" showCompany centered className="mx-auto" />
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            {tr("Menyiapkan Profil", "Preparing Profile")}
          </h1>

          <p className="mt-3 text-gray-500">
            {tr(
              "Sedang memuat data kebugaran Anda.",
              "Loading your fitness data."
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="fitmate-app-page fitmate-onboarding-page min-h-screen bg-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <FitMateBrand href="/" size="lg" showCompany centered className="mx-auto" />

          <h1 className="mt-8 text-3xl font-bold">
            {isEditMode
              ? tr(
                  "Edit Profil Kebugaran",
                  "Edit Fitness Profile"
                )
              : tr(
                  "Buat Profil Kebugaran",
                  "Create Fitness Profile"
                )}
          </h1>

          <p className="mt-3 text-gray-600">
            {isEditMode
              ? tr(
                  "Perbarui data yang ingin Anda ubah.",
                  "Update the information you want to change."
                )
              : tr(
                  "Isi data singkat agar rencana latihan sesuai kebutuhan Anda.",
                  "Complete a short profile so your plan fits your needs."
                )}
          </p>
        </div>

        <div className="mt-10">
          <div className="flex justify-between text-sm text-gray-500">
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className={
                  index <= step
                    ? "font-semibold text-green-600"
                    : ""
                }
              >
                {tr(item.id, item.en)}
              </span>
            ))}
          </div>

          <div className="mt-3 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-600 transition-all duration-300"
              style={{
                width: `${
                  ((step + 1) /
                    STEPS.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm">
          {step === 0 && (
            <div>
              <h2 className="text-3xl font-bold">
                {tr(
                  "Apa tujuan utama Anda?",
                  "What is your main goal?"
                )}
              </h2>

              <p className="mt-3 text-gray-600">
                {tr(
                  "Pilih satu tujuan yang paling penting.",
                  "Choose the goal that matters most."
                )}
              </p>

              <div className="mt-8 grid gap-4">
                {GOAL_OPTIONS.map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateForm(
                          "goal",
                          option.value
                        )
                      }
                      className={`rounded-xl border p-5 text-left transition ${
                        formData.goal === option.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-green-400"
                      }`}
                    >
                      <div className="text-lg font-semibold">
                        <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 align-middle dark:bg-slate-800 dark:text-slate-200">
                          <FitMateIcon name={option.icon} className="h-4.5 w-4.5" />
                        </span>
                        {tr(option.id, option.en)}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {tr(
                          option.descriptionId,
                          option.descriptionEn
                        )}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-3xl font-bold">
                {tr(
                  "Seberapa berpengalaman Anda?",
                  "How experienced are you?"
                )}
              </h2>

              <p className="mt-3 text-gray-600">
                {tr(
                  "Tingkat latihan akan disesuaikan dengan jawaban Anda.",
                  "Training difficulty will match your answer."
                )}
              </p>

              <div className="mt-8 grid gap-4">
                {EXPERIENCE_OPTIONS.map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateForm(
                          "experience",
                          option.value
                        )
                      }
                      className={`rounded-xl border p-5 text-left transition ${
                        formData.experience ===
                        option.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-green-400"
                      }`}
                    >
                      <div className="font-semibold">
                        {tr(option.id, option.en)}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {tr(
                          option.descriptionId,
                          option.descriptionEn
                        )}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold">
                {tr(
                  "Berapa hari Anda bisa latihan?",
                  "How many days can you train?"
                )}
              </h2>

              <p className="mt-3 text-gray-600">
                {tr(
                  "Pilih jadwal yang realistis untuk dijalankan.",
                  "Choose a schedule you can follow realistically."
                )}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {TRAINING_DAY_OPTIONS.map((days) => {
                  const value = `${days} Hari`;

                  return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      updateForm(
                        "trainingDays",
                        value
                      )
                    }
                    className={`rounded-xl border p-5 font-semibold transition ${
                      formData.trainingDays ===
                      value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {days} {tr("Hari", "Days")}
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold">
                {tr("Data tubuh Anda", "Your body data")}
              </h2>

              <p className="mt-3 text-gray-600">
                {tr(
                  "Data ini membantu menyesuaikan rencana latihan.",
                  "This information helps personalize your workout plan."
                )}
              </p>

              <div className="mt-8 grid gap-5">
                <div>
                  <label className="text-sm font-medium">
                    {tr("Umur", "Age")}
                  </label>

                  <input
                    type="number"
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={(e) =>
                      updateForm(
                        "age",
                        e.target.value
                      )
                    }
                    placeholder="25"
                    className="mt-2 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    {tr("Jenis kelamin", "Gender")}
                  </label>

                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      updateForm(
                        "gender",
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-500"
                  >
                    <option value="">
                      {tr("Pilih jenis kelamin", "Choose gender")}
                    </option>

                    <option value="Male">
                      {tr("Laki-laki", "Male")}
                    </option>

                    <option value="Female">
                      {tr("Perempuan", "Female")}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    {tr("Tinggi badan (cm)", "Height (cm)")}
                  </label>

                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={formData.height}
                    onChange={(e) =>
                      updateForm(
                        "height",
                        e.target.value
                      )
                    }
                    placeholder="174"
                    className="mt-2 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    {tr("Berat badan (kg)", "Weight (kg)")}
                  </label>

                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={formData.weight}
                    onChange={(e) =>
                      updateForm(
                        "weight",
                        e.target.value
                      )
                    }
                    placeholder="71"
                    className="mt-2 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex gap-4">
            {step > 0 && (
              <button
                type="button"
                onClick={previousStep}
                disabled={isSaving}
                className="w-1/3 rounded-xl border border-gray-300 py-4 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tr("Kembali", "Back")}
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-green-600 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? tr("Menyimpan...", "Saving...")
                : step ===
                  STEPS.length - 1
                ? isEditMode
                  ? tr("Simpan Perubahan", "Save Changes")
                  : tr("Buat Profil", "Create Profile")
                : tr("Lanjut", "Continue")}
            </button>
          </div>

          {isEditMode && (
            <div className="mt-6 rounded-xl bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">
                {tr("Penting", "Important")}
              </p>

              <p className="mt-1 text-sm leading-6 text-yellow-700">
                {tr(
                  "Mengubah profil akan mereset rencana aktif.",
                  "Changing your profile resets the active plan."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
