'use client';

import { useState } from 'react';

const faqs = [
  {
    question: '무럭무럭은 어떤 동아리인가요?',
    answer:
      '무럭무럭은 기획, 디자인, 개발이 함께 프로젝트를 만들며 성장하는 IT 동아리입니다. 아이디어를 실제 서비스로 구현하는 경험을 중요하게 생각합니다.',
  },
  {
    question: '어떤 활동을 하나요?',
    answer:
      '팀 프로젝트, 해커톤/공모전 참여를 진행합니다. 활동 결과는 프로젝트/업적 페이지에서 확인할 수 있습니다.',
  },
  {
    question: '노베도 지원할 수 있나요?',
    answer:
      '네, 가능합니다. 기본 역량보다 성장 의지와 협업 태도를 더 중요하게 봅니다. 역할별 온보딩과 팀 내 협업으로 빠르게 적응할 수 있습니다.',
  },
  {
    question: '지원은 언제, 어떻게 하나요?',
    answer:
      '모집 시즌에 안내가 공지되며, 지원서 작성 후 간단한 인터뷰 과정을 거칩니다. 자세한 일정은 동아리 공지 채널에서 확인해 주세요.',
  },
  {
    question: '활동 시간은 어느 정도인가요?',
    answer:
      '서가별이 하고 싶을 때 합니다.',
  },
];

export default function QnaPage() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="min-h-screen bg-gradient-home">
      <section className="relative px-4 pt-28 text-center sm:pt-32">
        <div className="float-slower pointer-events-none absolute left-[8%] top-28 h-24 w-24 rounded-full bg-muruk-green-light/30 blur-2xl" />
        <div className="drift-slow pointer-events-none absolute right-[10%] top-36 h-28 w-28 rounded-full bg-muruk-green-medium/20 blur-2xl" />
        <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-muruk-green-primary">Q&A</p>
        <h1 className="reveal-up delay-1 mt-4 text-4xl font-bold text-muruk-green-darker sm:text-5xl">
          자주 묻는 질문
        </h1>
        <p className="reveal-up delay-2 mx-auto mt-4 max-w-2xl text-lg text-muruk-green-text/85">
          무럭무럭 지원 전 궁금한 내용을 먼저 확인해 보세요.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 pt-14 sm:px-6">
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                key={faq.question}
                className="overflow-hidden rounded-3xl border border-muruk-green-border/35 bg-white/90 shadow-sm backdrop-blur-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muruk-card-bg/70"
                >
                  <h2 className="text-lg font-semibold text-muruk-green-darker sm:text-xl">{faq.question}</h2>
                  <span className="text-2xl leading-none text-muruk-green-primary">{isOpen ? '−' : '+'}</span>
                </button>

                <div
                  className={`grid overflow-hidden transition-all duration-500 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-90'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`border-t border-muruk-green-border/20 px-6 py-5 transition-all duration-500 ease-out ${
                        isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
                      }`}
                    >
                      <p className="text-base leading-relaxed text-muruk-green-text/90">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

