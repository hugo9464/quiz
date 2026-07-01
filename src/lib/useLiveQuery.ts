import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Remplace le `useQuery` réactif de Convex : exécute `fetcher`, puis refetch à
// chaque changement Postgres sur l'une des `tables` (via Supabase Realtime).
// Renvoie `undefined` tant que le premier chargement n'est pas revenu (comme Convex).
export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  tables: string[],
  quizId?: string,
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  // On garde toujours le fetcher le plus récent sans relancer l'effet à chaque
  // rendu (le fetcher est une closure recréée à chaque render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void fetcherRef.current().then((result) => {
        if (!cancelled) setData(result);
      });
    };
    run();

    const channel = supabase.channel(
      `live:${tables.join(",")}:${quizId ?? "all"}`,
    );
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => run(),
      );
    }
    channel.subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tables.join(","), quizId]);

  return data;
}
