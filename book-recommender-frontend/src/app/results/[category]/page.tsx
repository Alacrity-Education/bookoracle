"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import Button from "@/components/ui/Button/Button";

import participationService from "@/services/participationService";
import { useSession } from "@/lib/session";


export default function ResultsPage() {
  const router = useRouter();
  const { session, ready } = useSession();

  // Guards against a second tap on a touchscreen recording the run twice.
  const [finishing, setFinishing] = useState(false);

  // Wait for sessionStorage to be read before concluding there is no result,
  // otherwise a refresh would flash the empty state.
  if (!ready) {
    return (
      <PageLayout>
        <p>Se încarcă...</p>
      </PageLayout>
    );
  }

  if (!session) {
    return (
      <PageLayout>
        <section className="mx-auto max-w-[900px] px-6 pt-16 pb-20 text-center">
          <h1>Rezultatul nu este disponibil</h1>

          <p>Nu am putut încărca rezultatul testului.</p>

          <Button onClick={() => router.push("/")}>Înapoi la început</Button>
        </section>
      </PageLayout>
    );
  }

  const { result, recommendations, answers, category } = session;
  const mainProfile = result.profiles[0];

  const handleFinish = async (destination: "email" | "finish") => {
    if (destination === "email") {
      router.push("/email");
      return;
    }

    setFinishing(true);

    try {
      // Queues itself when the tablet has no network, so this resolves either
      // way and the reader is never held on the results page by a failed save.
      await participationService.complete(category, {
        answers,
        destination: "finish",
        newsletter: false,
      });
    } catch (error) {
      // Only reached when the backend answered with an error it will keep
      // answering. Nothing the reader can do about it, and nothing that should
      // keep them from finishing.
      console.error("Could not save participation:", error);
    }

    router.push("/finish");
  };

  return (
    <PageLayout>
      <section className="mx-auto max-w-[900px] px-6 pt-16 pb-20">

        {/* ========================= */}
        {/* Literary profile            */}
        {/* ========================= */}

        <section className="mx-auto mb-20 max-w-[700px] text-center">

          <p className="mb-3 text-[0.85rem] font-semibold uppercase tracking-[0.12em] opacity-65">Profilul tău literar</p>

          <h1 className="text-[clamp(2.8rem,7vw,5rem)] leading-none">{mainProfile.name}</h1>

          <p className="mx-auto mt-7 max-w-[620px] text-[1.1rem] leading-[1.7] opacity-80">{mainProfile.description}</p>

          <div className="mt-8 inline-flex items-center gap-4 rounded-full border border-current px-[18px] py-3">
            <span className="text-[0.9rem]">
              Potrivire cu profilul tău
            </span>

            <strong className="text-[1.1rem]">{Math.round(mainProfile.similarity * 100)}%</strong>
          </div>

          <p className="mt-4 text-[0.9rem] opacity-60">
            Acesta este profilul literar care se potrivește cel mai bine cu
            răspunsurile tale.
          </p>

        </section>


        {/* ========================= */}
        {/* Recommendations             */}
        {/* ========================= */}

        <section className="mx-auto max-w-[760px]">

          <div className="mb-7">
            <p className="mb-3 text-[0.85rem] font-semibold uppercase tracking-[0.12em] opacity-65">Recomandările LIRA</p>

            <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.15]">Uite ce cărți îți recomandăm</h2>

            <p className="mt-3 opacity-70">Am ales aceste cărți pe baza personalității tale literare.</p>
          </div>

          {recommendations.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {recommendations.map((book) => (
                <article
                  data-book={book.book_id}
                  className="grid grid-cols-[56px_1fr] gap-5 rounded-2xl border border-hairline p-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-hairline-strong"
                  key={book.book_id}
                >

                  <div className="flex items-start justify-center pt-0.5 text-[0.9rem] font-semibold opacity-45">
                    {String(book.rank).padStart(2, "0")}
                  </div>

                  <div>

                    <h3 className="text-[1.35rem] leading-[1.25]">{book.title}</h3>

                    <p className="mt-1.5 mb-5 opacity-65">{book.author}</p>

                    <div className="flex items-center justify-between gap-4 text-[0.85rem] opacity-70">
                      <span>Potrivire cu profilul tău</span>

                      <strong className="text-[0.95rem] opacity-100">{Math.round(book.base_score * 100)}%</strong>
                    </div>

                  </div>

                </article>
              ))}
            </div>
          ) : (
            <p className="opacity-65">
              Recomandările nu sunt disponibile momentan.
            </p>
          )}

        </section>


        {/* ========================= */}
        {/* Actions                     */}
        {/* ========================= */}

        <div className="mt-14 flex justify-center gap-4">

          <Button
            onClick={() => handleFinish("email")}
            disabled={finishing}
          >
            Trimite-mi rezultatele pe mail
          </Button>

          <Button
            onClick={() => handleFinish("finish")}
            disabled={finishing}
          >
            Revin la început
          </Button>

        </div>

      </section>
    </PageLayout>
  );
}
