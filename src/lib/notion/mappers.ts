import type { Achievement } from '@/types/achievement';
import type { Member } from '@/types/member';
import type { Project } from '@/types/project';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

type NotionProperties = PageObjectResponse['properties'];
type PropertyValue = NotionProperties[string];

function getTitleText(prop: PropertyValue | undefined): string {
  if (prop?.type === 'title' && prop.title.length > 0) {
    return prop.title[0].plain_text;
  }
  return '';
}

function getRichText(prop: PropertyValue | undefined): string | null {
  if (prop?.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text[0].plain_text;
  }
  return null;
}

function getTextLike(prop: PropertyValue | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text[0].plain_text;
  }
  if (prop.type === 'select' && prop.select) {
    return prop.select.name;
  }
  if (prop.type === 'title' && prop.title.length > 0) {
    return prop.title[0].plain_text;
  }
  if (prop.type === 'formula' && prop.formula.type === 'string') {
    return prop.formula.string;
  }
  return null;
}

function getSelect(prop: PropertyValue | undefined): string | null {
  if (prop?.type === 'select' && prop.select) {
    return prop.select.name;
  }
  return null;
}

function getMultiSelect(prop: PropertyValue | undefined): string[] {
  if (prop?.type === 'multi_select') {
    return prop.multi_select.map((item) => item.name);
  }
  return [];
}

function getNumber(prop: PropertyValue | undefined): number {
  if (prop?.type === 'number' && prop.number !== null) {
    return prop.number;
  }
  return 0;
}

function getDate(prop: PropertyValue | undefined): string | null {
  if (prop?.type === 'date' && prop.date) {
    return prop.date.start;
  }
  return null;
}

function getFileUrl(prop: PropertyValue | undefined): string | null {
  if (prop?.type === 'files' && prop.files.length > 0) {
    const file = prop.files[0];
    if (file.type === 'file') {
      return file.file.url;
    }
    if (file.type === 'external') {
      return file.external.url;
    }
  }
  return null;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, '');
}

function getTextByCandidates(props: NotionProperties, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const direct = getTextLike(props[candidate]);
    if (direct) return direct;
  }

  const normalizedEntries = Object.entries(props).map(([key, value]) => ({
    key,
    normalized: normalizeKey(key),
    value,
  }));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    const matched = normalizedEntries.find((entry) => entry.normalized === normalizedCandidate);
    if (matched) {
      const value = getTextLike(matched.value);
      if (value) return value;
    }
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    const matched = normalizedEntries.find((entry) => entry.normalized.includes(normalizedCandidate));
    if (matched) {
      const value = getTextLike(matched.value);
      if (value) return value;
    }
  }

  return null;
}

export function mapPageToMember(page: PageObjectResponse): Member {
  const props = page.properties;
  const avatarPosition = getTextByCandidates(props, [
    'AvatarPosition',
    'Avatar Position',
    'AvatarPos',
    'Avatar Pos',
    'PhotoPosition',
    'Photo Position',
    'ImagePosition',
    'Image Position',
    '사진위치',
    '이미지위치',
  ]);

  return {
    id: page.id,
    name: getTitleText(props.Name),
    murukGeneration: getSelect(props.MurukGeneration) ?? getRichText(props.MurukGeneration),
    role: getSelect(props.Role),
    schoolGeneration: getSelect(props.SchoolGeneration) ?? getRichText(props.SchoolGeneration),
    className: getSelect(props.Class) ?? getRichText(props.Class),
    statusMessage: getRichText(props.Bio),
    avatarUrl: getFileUrl(props.Avatar),
    avatarPosition,
    order: getNumber(props.Order),
  };
}

export function mapPageToProject(page: PageObjectResponse): Project {
  const props = page.properties;

  return {
    id: page.id,
    name: getTitleText(props.Name),
    year: getSelect(props.Year) ?? getRichText(props.Year),
    description: getRichText(props.Description),
    logoUrl: getFileUrl(props.Logo),
    order: getNumber(props.Order),
  };
}

export function mapPageToAchievement(page: PageObjectResponse): Achievement {
  const props = page.properties;

  return {
    id: page.id,
    name: getTitleText(props.Name),
    year: getSelect(props.Year) ?? getRichText(props.Year),
    award: getRichText(props.Award),
    team: getRichText(props.Team),
    members: getMultiSelect(props.Members),
    date: getDate(props.Date),
    thumbnailUrl: getFileUrl(props.Thumbnail),
    order: getNumber(props.Order),
  };
}
