import ContactPage from "./contact-client";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ContactPageWrapper({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <ContactPage
      caseSlug={(params.case as string) ?? null}
      topic={(params.topic as string) ?? null}
      mediaId={(params.media as string) ?? null}
    />
  );
}
