import { getPublishedMembers } from '@/lib/notion';
import MembersPageClient from './MembersPageClient';

export const revalidate = 1800;

export default async function MembersPage() {
  const members = await getPublishedMembers();
  return <MembersPageClient members={members} />;
}
