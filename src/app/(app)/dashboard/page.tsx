import { redirect } from "next/navigation";

/** Inicio se fusionó con Foco en el rediseño; la ruta vieja sigue funcionando. */
export default function Page() {
  redirect("/focus");
}
