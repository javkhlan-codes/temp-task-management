import { createSocialCard, socialImageSize } from "./social-card";

export const runtime = "nodejs";
export const alt = "Pro Team — Багийн ажил. Нэг хэмнэл.";
export const size = socialImageSize;
export const contentType = "image/png";

export default async function TwitterImage() {
  return await createSocialCard();
}
