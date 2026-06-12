import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-6" />
          </div>
          <CardTitle emphasis="prominent" className="text-lg">
            Markdown Memory
          </CardTitle>
          <CardDescription>
            AIが生成したMarkdownを保存し、どの端末からでも見返し・共有できます。
            続けるにはサインインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <Button type="submit" size="lg" className="w-full">
                Googleでサインイン
              </Button>
            </form>
            <Link
              href="/demo"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full",
              )}
            >
              ログインせずにデモを見る
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
