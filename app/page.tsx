import { getIdentity } from "@/lib/server/identity";
import { Welcome } from "@/components/portal/welcome";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getIdentity();
  return <Welcome signedIn={!!user} />;
}
