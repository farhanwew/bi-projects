import { useEffect, useState, type ComponentType } from "react";
import { App } from "./App";
import { StoryPage } from "./StoryPage";
import styles from "./Shell.module.css";

/**
 * Kerangka dengan sidebar untuk berpindah antara versi 1 (sebelum teori storytelling) dan versi 2 (sesudah).
 * Rute memakai hash supaya tetap jalan di GitHub Pages tanpa konfigurasi server: #/sebelum dan #/cerita.
 * Arc versi gratis tidak punya sidebar (sidebar-rail dan workspace-sidebar hanya Pro), jadi navigasinya dibuat sendiri.
 */
type Route = { id: string; label: string; hint: string; page: ComponentType };
const GROUPS: { title: string; routes: Route[] }[] = [
  { title: "Sebelum (versi 1)", routes: [{ id: "sebelum", label: "Dashboard umum", hint: "Semua grafik, tanpa audiens tertentu", page: App }] },
  {
    title: "Sesudah (versi 2)", routes: [
      { id: "cerita", label: "Dashboard versi 2", hint: "Cerita untuk pemilik usaha, lalu detail pendukung", page: StoryPage },
    ],
  },
];
const ROUTES = GROUPS.flatMap(g => g.routes);
const routeOf = (hash: string) => ROUTES.find(r => hash.replace(/^#\/?/, "").split("?")[0] === r.id) ?? ROUTES[0];
/** `#/cerita?polos` menyembunyikan sidebar, untuk ekspor gambar ke slide. */
const plainOf = (hash: string) => hash.split("?")[1] === "polos";

export function Shell() {
  const [route, setRoute] = useState(() => routeOf(window.location.hash));
  const [plain, setPlain] = useState(() => plainOf(window.location.hash));
  useEffect(() => {
    const onHash = () => { setRoute(routeOf(window.location.hash)); setPlain(plainOf(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const Page = route.page;
  if (plain) return <Page />;
  return (
    <div className={styles.shell}>
      <nav className={styles.side} aria-label="Halaman">
        <p className={styles.brand}>Penjualan frozen food 2020</p>
        {GROUPS.map(g => (
          <div key={g.title} className={styles.group}>
            <p className={styles.groupTitle}>{g.title}</p>
            <ul className={styles.list}>
              {g.routes.map(r => (
                <li key={r.id}>
                  <a href={`#/${r.id}`} className={styles.link} aria-current={r.id === route.id ? "page" : undefined}>
                    <span>{r.label}</span>
                    <small>{r.hint}</small>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.content}><Page key={route.id} /></div>
    </div>
  );
}
