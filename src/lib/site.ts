import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';
export const SITE_NAME = '무럭무럭 | MRMR';
export const SITE_DESCRIPTION = '한국디지털미디어고등학교 스마트팜 동아리 무럭무럭 공식 웹사이트.';

/** 공유 카드 이미지 (public/og.png, 크림색 배경 가운데에 로고). */
const OG_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: '무럭무럭 로고' };

/*
 * 하위 페이지가 openGraph·twitter 를 정의하면 부모 값은 키 단위로 섞이지 않고 통째로 바뀐다.
 * 그래서 이미지·사이트명·로케일·타입은 공용 객체로 두고 페이지마다 펼쳐 쓴다.
 */
export const baseOpenGraph = {
  type: 'website',
  locale: 'ko_KR',
  siteName: SITE_NAME,
  images: [OG_IMAGE],
} satisfies Metadata['openGraph'];

export const baseTwitter = {
  card: 'summary_large_image',
  images: [OG_IMAGE.url],
} satisfies Metadata['twitter'];

interface PageMetadataInput {
  path: string;
  title: string;
  description: string;
  keywords: string[];
}

/** 하위 페이지 메타데이터. 공유 미리보기(og·twitter)도 그 페이지의 제목·설명·주소로 나온다. */
export function pageMetadata({ path, title, description, keywords }: PageMetadataInput): Metadata {
  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, url: path, title, description },
    twitter: { ...baseTwitter, title, description },
  };
}
