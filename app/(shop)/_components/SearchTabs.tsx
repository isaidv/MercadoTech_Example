"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CatalogPage } from "@/app/(shop)/_components/CatalogPage";
import { SemanticSearchPanel } from "@/app/(shop)/_components/SemanticSearchPanel";

type TabValue = "exact" | "ai";

/**
 * `/buscar` (Fase 4.4): dos pestañas sobre la MISMA query de la URL.
 * "Coincidencia exacta" reutiliza `CatalogPage` tal cual — sigue
 * funcionando exactamente igual que en la sesión 3, anónimos incluidos.
 * "Resultados con IA" es la búsqueda semántica nueva.
 *
 * La pestaña IA se renderiza recién cuando `activeTab === "ai"` (no
 * apenas `TabsContent` la monta) a propósito: cada búsqueda semántica
 * genera un embedding real contra Voyage, así que visitar `/buscar` no
 * debe disparar ese costo si la persona nunca mira esa pestaña.
 */
export function SearchTabs() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [activeTab, setActiveTab] = useState<TabValue>("exact");

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
      <TabsList>
        <TabsTrigger value="exact">Coincidencia exacta</TabsTrigger>
        <TabsTrigger value="ai">Resultados con IA</TabsTrigger>
      </TabsList>
      <TabsContent value="exact">
        <CatalogPage />
      </TabsContent>
      <TabsContent value="ai">{activeTab === "ai" ? <SemanticSearchPanel query={query} /> : null}</TabsContent>
    </Tabs>
  );
}
