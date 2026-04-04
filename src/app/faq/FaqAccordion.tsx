'use client';

import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  faqs: FAQ[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-14">
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <article
              key={faq.question}
              className="overflow-hidden rounded-3xl border border-muruk-green-border/35 bg-white/90 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muruk-card-bg/70 sm:gap-4 sm:px-6 sm:py-5">
                <h2 className="text-balance-safe text-base font-semibold text-muruk-green-darker sm:text-lg md:text-xl">
                  {faq.question}
                </h2>
                <span className="text-xl leading-none text-muruk-green-primary sm:text-2xl">{isOpen ? '−' : '+'}</span>
              </button>

              <div
                className={`grid overflow-hidden transition-all duration-500 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-90'
                }`}>
                <div className="overflow-hidden">
                  <div
                    className={`border-t border-muruk-green-border/20 px-4 py-4 transition-all duration-500 ease-out sm:px-6 sm:py-5 ${
                      isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
                    }`}>
                    <p className="text-balance-safe text-sm leading-relaxed text-muruk-green-text/90 sm:text-base">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
