import { getBrandProfiles } from "@/lib/db/queries/brand-profiles";
import { getStudioGenerations } from "@/lib/db/queries/studio-generations";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export default async function StudioPage() {
  const [profiles, history] = await Promise.all([
    getBrandProfiles(),
    getStudioGenerations(undefined, 20),
  ]);

  return (
    <StudioWorkspace initialProfiles={profiles} initialHistory={history} />
  );
}
