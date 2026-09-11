import { requireIdentity } from "@/lib/server/identity";
import { Applicant } from "@/components/portal/applicant";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireIdentity("/applicant");
  return <Applicant />;
}
