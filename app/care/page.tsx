import { redirect } from "next/navigation";

export default function CareRedirectPage() {
  redirect("/profile#revisit");
}
