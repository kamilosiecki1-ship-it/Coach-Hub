import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAiConfigured } from "@/lib/aiService";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlobalMentorView } from "@/components/mentor/GlobalMentorView";

export const metadata = { title: "Mentor AI — Coach Hub" };

export default async function MentorPage({
  searchParams,
}: {
  searchParams: { convId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/logowanie");

  const aiEnabled = isAiConfigured();
  const initialConvId = searchParams.convId;

  return (
    <AppLayout>
      <GlobalMentorView aiEnabled={aiEnabled} initialConvId={initialConvId} />
    </AppLayout>
  );
}
