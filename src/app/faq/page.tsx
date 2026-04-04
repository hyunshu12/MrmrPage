import FaqAccordion from './FaqAccordion';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

const faqs = [
  {
    question: '무럭무럭은 어떤 동아리인가요?',
    answer:
      '무럭무럭은 교내 유일 스마트팜동아리로 농작물을 관리하고 판매하는 활동을 진행합니다. 또한 it프로젝트와 교외 대회, 부스 운영, 식물과 관련한 실험등 다양한 활동을 진행하고 있습니다.',
  },
  {
    question: '무럭무럭에 들어오면 어떤 장점이 있나요?',
    answer:
      '대회등의 활동을 통해 기획, 디자인, 개발 능력을 키워나갈 수 있으며, 다양한 학과의 친구, 선배들과 끈끈해질 수 있습니다. 디미고에서 가장 재미있는 동아리생활 보장합니다.',
  },
  {
    question: '경쟁률이 어떻게되나요?',
    answer:
      '2025년 기준 4:1 정도 됩니다. 기획/디자인/개발 학과에 상관 없이 뽑을 예정이니 부담없이 편하게 지원해주세요.',
  },
  {
    question: '무럭무럭이 원하는 인재상은 무엇인가요?',
    answer:
      '다른 동아리원을 배려하는 따뜻한 인성을 가진 사람을 최우선으로 생각합니다. 또한, 맡은 일에 책임감을 갖고 임하며, 열정적인 태도로 동아리 활동에 참여 할 수 있는 분을 찾고 있습니다.',
  },
  {
    question: '무럭무럭은 어떤 분위기인가요?',
    answer:
      '무럭무럭은 디미고에서 동아리원들끼리 가장 친밀하고 화목한 분위기를 자랑하는 동아리입니다. 열정적이고 친근한 선배들과 함께 열심히 활동하며 성과를 만들어나갈 수 있습니다. 함께 즐겁게 활동하며 소중한 고교 시절의 추억을 쌓고 싶은 분들은 지원하세요!!',
  },
  {
    question: '포트폴리오 제출 필수인가요?',
    answer:
      '제출이 필수는 아니나 포트폴리오는 본인의 능력과 성과를 더 명확히 보여줄 수 있는 좋은 기회입니다. 본인의 역량을 더 어필하고 싶은 분들은 포트폴리오를 제출해 주세요.',
  },
];

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="relative px-4 pt-24 text-center sm:pt-32">
        <div className="float-slower pointer-events-none absolute left-[8%] top-28 h-24 w-24 rounded-full bg-muruk-green-light/30 blur-2xl" />
        <div className="drift-slow pointer-events-none absolute right-[10%] top-36 h-28 w-28 rounded-full bg-muruk-green-medium/20 blur-2xl" />
        <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-muruk-green-primary">FAQ</p>
        <h1 className="reveal-up delay-1 mt-4 text-3xl font-bold text-muruk-green-darker sm:text-4xl lg:text-5xl">
          자주 묻는 질문
        </h1>
        <p className="text-balance-safe reveal-up delay-2 mx-auto mt-4 max-w-2xl text-base text-muruk-green-text/85 sm:text-lg">
          무럭무럭 지원 전 궁금한 내용을 먼저 확인해 보세요.
        </p>
      </section>

      <FaqAccordion faqs={faqs} />
    </div>
  );
}
