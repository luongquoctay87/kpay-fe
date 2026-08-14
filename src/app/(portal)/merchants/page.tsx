import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

/** Legacy merchant list → unified customer directory. */
export default function Page() {
  redirect(`${ROUTES.customers}?ownerType=merchant`);
}
