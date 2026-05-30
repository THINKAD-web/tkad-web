import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  deleteFromBunnyStorage,
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
  bunnyPathFromPublicUrl,
} from "@/lib/bunny-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const PROPOSAL_PATH = (mediaId: string) =>
  `tkad/proposals/${mediaId}/proposal.pdf`;

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isBunnyStorageConfigured()) {
    return json({ error: "Bunny storage not configured" }, 503);
  }

  const { id } = await params;
  const db = getPrisma();
  const existing = await db.media.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Missing file" }, 400);
  }

  const type = (file.type || "").toLowerCase();
  if (type && type !== "application/pdf") {
    return json({ error: "PDF only" }, 400);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength < 1) {
    return json({ error: "Empty file" }, 400);
  }

  const path = PROPOSAL_PATH(id);
  const prevPath = existing.proposalUrl
    ? bunnyPathFromPublicUrl(existing.proposalUrl)
    : null;

  const out = await uploadToBunnyStorage({
    path,
    bytes,
    contentType: "application/pdf",
  });

  const fileName =
    (typeof form?.get("fileName") === "string" &&
      form.get("fileName")?.toString().trim()) ||
    file.name?.trim() ||
    `${existing.name.replace(/[\\/:*?"<>|]/g, "_")}_제안서.pdf`;

  const updated = await db.media.update({
    where: { id },
    data: {
      proposalUrl: out.publicUrl,
      proposalFileName: fileName,
      hasProposal: true,
    },
  });

  if (prevPath && prevPath !== path) {
    try {
      await deleteFromBunnyStorage(prevPath);
    } catch (e) {
      console.warn("[proposal-upload] old file delete failed", e);
    }
  }

  revalidatePath("/ko/media");
  revalidatePath("/en/media");
  if (existing.slug) {
    revalidatePath(`/ko/media/${existing.slug}`);
    revalidatePath(`/en/media/${existing.slug}`);
  }

  return json({
    ok: true,
    media: {
      id: updated.id,
      proposalUrl: updated.proposalUrl,
      proposalFileName: updated.proposalFileName,
      hasProposal: updated.hasProposal,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const existing = await db.media.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const path = existing.proposalUrl
    ? bunnyPathFromPublicUrl(existing.proposalUrl)
    : PROPOSAL_PATH(id);

  if (path && isBunnyStorageConfigured()) {
    try {
      await deleteFromBunnyStorage(path);
    } catch (e) {
      console.warn("[proposal-upload] delete failed", e);
    }
  }

  const updated = await db.media.update({
    where: { id },
    data: {
      proposalUrl: null,
      proposalFileName: null,
      hasProposal: false,
    },
  });

  revalidatePath("/ko/media");
  revalidatePath("/en/media");
  if (existing.slug) {
    revalidatePath(`/ko/media/${existing.slug}`);
    revalidatePath(`/en/media/${existing.slug}`);
  }

  return json({
    ok: true,
    media: {
      id: updated.id,
      proposalUrl: null,
      proposalFileName: null,
      hasProposal: false,
    },
  });
}
