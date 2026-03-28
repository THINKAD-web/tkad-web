import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy/5">
          <SearchX className="h-10 w-10 text-navy/40" />
        </div>
        <h1 className="text-6xl font-extrabold text-gold">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-navy">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mt-3 text-muted-foreground">
          요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
        </p>
        <Link href="/">
          <Button
            className="mt-8 bg-gold text-navy hover:bg-gold-dark font-semibold rounded-full px-8"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
}
