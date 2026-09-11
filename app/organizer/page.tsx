import { requireIdentity } from "@/lib/server/identity";
import { Organizer } from "@/components/portal/organizer";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireIdentity("/organizer");
  return <Organizer />;
}
