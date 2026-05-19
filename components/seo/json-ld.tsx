import { serializeJsonLd } from "@/lib/seo";

type Props = {
  data: unknown;
};

/**
 * JSON-LD — Server Component 전용.
 * Client Component 트리 안에서는 `<script>` 를 쓰지 말 것 (React 19 경고).
 */
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
