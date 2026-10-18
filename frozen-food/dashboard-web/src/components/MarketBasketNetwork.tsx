import React, { useMemo, useState } from "react";
import { 
  Sparkles, 
  Flame, 
  Layers, 
  Shuffle, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp,
  Tag
} from "lucide-react";
import type { Pair } from "../analytics";
import { int, one } from "../format";
import seafoodImg from "../assets/category-seafood.jpg";
import sosisImg from "../assets/category-sosis.jpg";
import nuggetImg from "../assets/product-nugget.jpg";
import styles from "./MarketBasketNetwork.module.css";

interface MarketBasketNetworkProps {
  pasangan: {
    nota: number;
    notaMulti: number;
    top: Pair[];
  };
}

type FilterMode = "all" | "high_lift" | "top_volume" | "cross_brand";

interface GraphNode {
  id: string;
  name: string;
  shortName: string;
  brand: string;
  degree: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  borderColor: string;
}

interface GraphLink {
  id: string;
  source: GraphNode;
  target: GraphNode;
  pair: Pair;
  strokeWidth: number;
  strokeColor: string;
  isHighLift: boolean;
}

const BRAND_PALETTE: Record<string, { fill: string; border: string }> = {
  Okey: { fill: "#ea580c", border: "#fb923c" },      // Orange
  Jofrans: { fill: "#7c3aed", border: "#a78bfa" },   // Purple
  Belfoods: { fill: "#2563eb", border: "#60a5fa" },  // Blue
  Minaku: { fill: "#059669", border: "#34d399" },    // Emerald
  Champ: { fill: "#e11d48", border: "#fb7185" },     // Rose
  Lainnya: { fill: "#475569", border: "#94a3b8" },   // Slate
};

function getBrand(name: string): string {
  const first = name.split(" ")[0];
  if (["Okey", "Jofrans", "Belfoods", "Minaku", "Champ"].includes(first)) {
    return first;
  }
  return "Lainnya";
}

function cleanShortName(name: string): string {
  return name
    .replace(/\s+X\s+\d+.*$/i, "")
    .replace(/\s+500\s*gr.*$/i, " 500g")
    .replace(/\s+1000\s*gr.*$/i, " 1kg")
    .replace(/\s+225\s*gr.*$/i, " 225g");
}

function getPairThumbnail(pair: Pair): string {
  const combined = (pair.a + " " + pair.b).toLowerCase();
  if (combined.includes("nugget")) return nuggetImg;
  if (combined.includes("otak") || combined.includes("ikan") || combined.includes("tempura") || combined.includes("minaku")) return seafoodImg;
  return sosisImg;
}

export function MarketBasketNetwork({ pasangan }: MarketBasketNetworkProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Filter pairs based on active perspective
  const filteredPairs = useMemo(() => {
    let list = pasangan.top.slice(0, 16);
    if (filterMode === "high_lift") {
      list = list.filter(p => p.lift >= 2.0);
    } else if (filterMode === "top_volume") {
      list = list.slice(0, 8);
    } else if (filterMode === "cross_brand") {
      list = list.filter(p => p.bedaMerek);
    }
    return list;
  }, [pasangan.top, filterMode]);

  // Build network graph layout
  const { nodes, links, nodeMap } = useMemo(() => {
    const nMap = new Map<string, { id: string; degree: number; connections: number }>();
    filteredPairs.forEach(p => {
      if (!nMap.has(p.a)) nMap.set(p.a, { id: p.a, degree: 0, connections: 0 });
      if (!nMap.has(p.b)) nMap.set(p.b, { id: p.b, degree: 0, connections: 0 });
      nMap.get(p.a)!.degree += p.n;
      nMap.get(p.b)!.degree += p.n;
      nMap.get(p.a)!.connections += 1;
      nMap.get(p.b)!.connections += 1;
    });

    const rawNodes = [...nMap.values()];
    const W = 820, H = 500, cx = W / 2, cy = H / 2;
    const R = 185;

    // Initial radial placement
    const gNodes: GraphNode[] = rawNodes.map((rn, i) => {
      const angle = (i / rawNodes.length) * 2 * Math.PI;
      const brand = getBrand(rn.id);
      const palette = BRAND_PALETTE[brand] || BRAND_PALETTE.Lainnya;
      const radius = Math.max(16, Math.min(30, 16 + Math.sqrt(rn.degree) * 0.75));
      return {
        id: rn.id,
        name: rn.id,
        shortName: cleanShortName(rn.id),
        brand,
        degree: rn.degree,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        radius,
        color: palette.fill,
        borderColor: palette.border,
      };
    });

    const gNodeMap = new Map(gNodes.map(n => [n.id, n]));

    // Deterministic spring simulation iterations
    const vx = new Map(gNodes.map(n => [n.id, 0]));
    const vy = new Map(gNodes.map(n => [n.id, 0]));

    for (let iter = 0; iter < 160; iter++) {
      // Repulsion between all pairs of nodes
      for (let i = 0; i < gNodes.length; i++) {
        for (let j = i + 1; j < gNodes.length; j++) {
          const na = gNodes[i], nb = gNodes[j];
          const dx = nb.x - na.x;
          const dy = nb.y - na.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repForce = 32000 / (dist * dist);
          const fx = (dx / dist) * repForce;
          const fy = (dy / dist) * repForce;
          vx.set(na.id, vx.get(na.id)! - fx);
          vy.set(na.id, vy.get(na.id)! - fy);
          vx.set(nb.id, vx.get(nb.id)! + fx);
          vy.set(nb.id, vy.get(nb.id)! + fy);
        }
      }

      // Attraction along links
      filteredPairs.forEach(p => {
        const na = gNodeMap.get(p.a);
        const nb = gNodeMap.get(p.b);
        if (!na || !nb) return;
        const dx = nb.x - na.x;
        const dy = nb.y - na.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = p.lift >= 2.5 ? 120 : 160;
        const attForce = (dist - targetDist) * 0.05;
        const fx = (dx / dist) * attForce;
        const fy = (dy / dist) * attForce;
        vx.set(na.id, vx.get(na.id)! + fx);
        vy.set(na.id, vy.get(na.id)! + fy);
        vx.set(nb.id, vx.get(nb.id)! - fx);
        vy.set(nb.id, vy.get(nb.id)! - fy);
      });

      // Center gravity & damping
      gNodes.forEach(n => {
        const vvx = (vx.get(n.id)! + (cx - n.x) * 0.016) * 0.65;
        const vvy = (vy.get(n.id)! + (cy - n.y) * 0.016) * 0.65;
        vx.set(n.id, vvx);
        vy.set(n.id, vvy);
        n.x += vvx * 0.15;
        n.y += vvy * 0.15;
        n.x = Math.max(90, Math.min(W - 90, n.x));
        n.y = Math.max(70, Math.min(H - 70, n.y));
      });
    }

    // Build visual links
    const maxN = Math.max(1, ...filteredPairs.map(p => p.n));
    const gLinks: GraphLink[] = filteredPairs.map((p, idx) => {
      const source = gNodeMap.get(p.a)!;
      const target = gNodeMap.get(p.b)!;
      const strokeWidth = Math.max(2, Math.min(8, 2 + (p.n / maxN) * 6));
      let strokeColor = "#94a3b8"; // neutral default
      if (p.lift >= 2.5) {
        strokeColor = "#10b981"; // high lift (bundling golden candidate)
      } else if (p.lift >= 1.8) {
        strokeColor = "#3b82f6"; // strong cross-sell
      }
      return {
        id: `link-${idx}`,
        source,
        target,
        pair: p,
        strokeWidth,
        strokeColor,
        isHighLift: p.lift >= 2.5,
      };
    });

    return { nodes: gNodes, links: gLinks, nodeMap: gNodeMap };
  }, [filteredPairs]);

  // Determine connected neighbor IDs when a node is selected
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return null;
    const ids = new Set<string>([selectedNode]);
    links.forEach(l => {
      if (l.source.id === selectedNode) ids.add(l.target.id);
      if (l.target.id === selectedNode) ids.add(l.source.id);
    });
    return ids;
  }, [selectedNode, links]);

  // Active details card: edge or selected node
  const activePair = selectedPair || (selectedNode ? links.find(l => l.source.id === selectedNode || l.target.id === selectedNode)?.pair ?? null : null);

  const highestLiftPair = useMemo(() => {
    if (!pasangan.top.length) return null;
    return [...pasangan.top].sort((a, b) => b.lift - a.lift)[0];
  }, [pasangan.top]);

  return (
    <article className={styles.container}>
      {/* Header & BI Focus Badges */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>Peta Barang yang Sering Dibeli Bersamaan</h3>
            <span className={styles.badgeDiag}>Ide Paket Hemat</span>
          </div>
          <p className={styles.subtitle}>
            Cari tahu barang apa saja yang sering dibeli barengan dalam 1 nota untuk membuat <strong>paket promo hemat (bundling)</strong> yang memikat pelanggan.
          </p>
        </div>

        {/* Filter Perspective Pills */}
        <div className={styles.filterPills} role="group" aria-label="Pilihan Pasangan Produk">
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterMode("all")}
          >
            Semua Pasangan
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === "high_lift" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterMode("high_lift")}
          >
            <Flame size={14} className={styles.iconFlame} />
            <span>Paling Cocok Dibundling (≥ 2×)</span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === "top_volume" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterMode("top_volume")}
          >
            <Layers size={14} />
            <span>Paling Sering Dibeli Bareng</span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === "cross_brand" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterMode("cross_brand")}
          >
            <Shuffle size={14} />
            <span>Beda Pabrik / Merek</span>
          </button>
        </div>
      </header>

      {/* 3 Executive BI Metric Highlights */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Nota Belanja &gt;1 Macam Barang</span>
          <span className={styles.kpiVal}>{int(pasangan.notaMulti)} Nota</span>
          <span className={styles.kpiSub}>
            {((pasangan.notaMulti / (pasangan.nota || 1)) * 100).toFixed(1)}% pembeli belanja lebih dari satu jenis barang
          </span>
        </div>

        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Pasangan Paling Menempel</span>
          <span className={`${styles.kpiVal} ${styles.colorSuccess}`}>
            {highestLiftPair ? `${one(highestLiftPair.lift)}× Lipat` : "—"}
          </span>
          <span className={styles.kpiSub}>
            {highestLiftPair ? `${cleanShortName(highestLiftPair.a)} + ${cleanShortName(highestLiftPair.b)}` : ""}
          </span>
        </div>

        <div className={styles.kpiBox}>
          <span className={styles.kpiLabel}>Pasangan Paling Laris Dibeli Bareng</span>
          <span className={styles.kpiVal}>
            {pasangan.top[0] ? `${int(pasangan.top[0].n)} Nota` : "—"}
          </span>
          <span className={styles.kpiSub}>
            {pasangan.top[0] ? `${cleanShortName(pasangan.top[0].a)} + ${cleanShortName(pasangan.top[0].b)}` : ""}
          </span>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className={styles.graphWrapper}>
        <svg
          viewBox="0 0 820 500"
          className={styles.svgCanvas}
          onClick={() => { setSelectedNode(null); setSelectedPair(null); }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Pattern */}
          <g className={styles.gridBackground} opacity="0.15">
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 100} y1="0" x2={i * 100} y2="500" stroke="var(--border)" strokeWidth="1" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`gy-${i}`} x1="0" y1={i * 100} x2="820" y2={i * 100} stroke="var(--border)" strokeWidth="1" />
            ))}
          </g>

          {/* Links (Edges) */}
          <g className={styles.linksLayer}>
            {links.map(l => {
              const isSelected = selectedPair?.id === l.pair.id;
              const isConnected = connectedNodeIds
                ? connectedNodeIds.has(l.source.id) && connectedNodeIds.has(l.target.id)
                : true;
              const opacity = isSelected ? 1 : isConnected ? (l.isHighLift ? 0.95 : 0.6) : 0.12;
              const strokeColor = isSelected ? "var(--foreground)" : l.strokeColor;
              const strokeWidth = isSelected ? l.strokeWidth + 2 : l.strokeWidth;

              // Quadratic curve midpoint for subtle organic curving
              const mx = (l.source.x + l.target.x) / 2;
              const my = (l.source.y + l.target.y) / 2;

              return (
                <g key={l.id} className={styles.linkGroup}>
                  <line
                    x1={l.source.x}
                    y1={l.source.y}
                    x2={l.target.x}
                    y2={l.target.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    strokeLinecap="round"
                    filter={l.isHighLift ? "url(#glow)" : undefined}
                    className={styles.linkLine}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedPair(l.pair);
                      setSelectedNode(null);
                    }}
                  />
                  {/* Invisible thick hover target */}
                  <line
                    x1={l.source.x}
                    y1={l.source.y}
                    x2={l.target.x}
                    y2={l.target.y}
                    stroke="transparent"
                    strokeWidth={14}
                    className={styles.linkHoverTrigger}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedPair(l.pair);
                      setSelectedNode(null);
                    }}
                  />
                  {/* Lift Tag in the middle of high-lift edges */}
                  {l.pair.lift >= 2.0 && isConnected && (
                    <g transform={`translate(${mx}, ${my})`} pointerEvents="none" opacity={opacity}>
                      <rect
                        x="-18"
                        y="-10"
                        width="36"
                        height="20"
                        rx="10"
                        fill="var(--surface)"
                        stroke={strokeColor}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="var(--foreground)"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="var(--font-display)"
                      >
                        {one(l.pair.lift)}×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes Layer */}
          <g className={styles.nodesLayer}>
            {nodes.map(n => {
              const isSelected = selectedNode === n.id;
              const isHighlighted = connectedNodeIds ? connectedNodeIds.has(n.id) : true;
              const opacity = isSelected ? 1 : isHighlighted ? 1 : 0.2;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  className={`${styles.nodeGroup} ${isSelected ? styles.nodeSelected : ""}`}
                  opacity={opacity}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedNode(prev => (prev === n.id ? null : n.id));
                    setSelectedPair(null);
                  }}
                >
                  {/* Outer Pulsing Halo */}
                  {isSelected && (
                    <circle
                      r={n.radius + 8}
                      fill="none"
                      stroke={n.borderColor}
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={n.radius}
                    fill={n.color}
                    stroke={n.borderColor}
                    strokeWidth="2.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                    className={styles.nodeCircle}
                  />

                  {/* Node Brand Initial Badge in center */}
                  <text
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="var(--font-display)"
                    pointerEvents="none"
                  >
                    {n.brand[0]}
                  </text>

                  {/* Label Text below node */}
                  <text
                    y={n.radius + 14}
                    textAnchor="middle"
                    className={styles.nodeLabel}
                    pointerEvents="none"
                  >
                    {n.shortName}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating BI Insight Card on Node/Edge selection */}
        {activePair && (
          <div className={styles.insightFloatingCard}>
            <div className={styles.cardHeaderSmall}>
              <img
                src={getPairThumbnail(activePair)}
                alt="Thumbnail Produk"
                className={styles.cardThumbSmall}
              />
              <div>
                <span className={styles.cardTagSmall}>
                  {activePair.lift >= 2.0 ? "🔥 Sangat Cocok Dibikin Paket Bundling" : "🛒 Pasangan Sering Dibeli Bareng"}
                </span>
                <strong className={styles.cardTitleSmall}>
                  {cleanShortName(activePair.a)} + {cleanShortName(activePair.b)}
                </strong>
              </div>
            </div>

            <div className={styles.metricGridSmall}>
              <div className={styles.metricMini}>
                <span>Kekuatan Pasangan</span>
                <strong style={{ color: activePair.lift >= 2.0 ? "var(--success)" : "var(--accent)" }}>
                  {one(activePair.lift)}× Lipat
                </strong>
              </div>
              <div className={styles.metricMini}>
                <span>Berapa Kali Dibeli</span>
                <strong>{int(activePair.n)} Nota</strong>
              </div>
              <div className={styles.metricMini}>
                <span>Jumlah Pelanggan</span>
                <strong>{int(activePair.pelanggan)} Orang/Toko</strong>
              </div>
              <div className={styles.metricMini}>
                <span>Asal Pabrik</span>
                <strong>{activePair.bedaMerek ? "Beda Merek" : "Satu Merek"}</strong>
              </div>
            </div>

            <div className={styles.confidenceBarGroup}>
              <div className={styles.confRow}>
                <span>Beli {cleanShortName(activePair.a)} &rarr; ikut beli {cleanShortName(activePair.b)}:</span>
                <strong>{activePair.pctA}%</strong>
              </div>
              <div className={styles.confRow}>
                <span>Beli {cleanShortName(activePair.b)} &rarr; ikut beli {cleanShortName(activePair.a)}:</span>
                <strong>{activePair.pctB}%</strong>
              </div>
            </div>

            <p className={styles.biTakeaway}>
              {activePair.lift >= 2.0 ? (
                <>
                  <strong>Saran Penjualan:</strong> Pelanggan membeli kedua barang ini <strong>{one(activePair.lift)} kali lipat</strong> lebih sering dibandingkan barang lain. Sangat menguntungkan jika dijadikan <strong>Paket Hemat Promo</strong> atau diletakkan berdampingan di etalase pendingin.
                </>
              ) : (
                <>
                  <strong>Saran Penjualan:</strong> Sering dibeli bersamaan ({int(activePair.n)} nota) karena kedua barang ini memang termasuk barang yang paling laris dan dicari pembeli.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Legend & Guide Bar */}
      <footer className={styles.legendBar}>
        <div className={styles.legendGroup}>
          <span className={styles.legendTitle}>Kekuatan Pasangan:</span>
          <span className={styles.legendPill}>
            <span className={styles.dotHigh} />
            <span>Sangat Cocok Bundling (&ge; 2.0×)</span>
          </span>
          <span className={styles.legendPill}>
            <span className={styles.dotMed} />
            <span>Sering Dibeli Bareng (1.5× – 2.0×)</span>
          </span>
          <span className={styles.legendPill}>
            <span className={styles.dotLow} />
            <span>Normal (&lt; 1.5×)</span>
          </span>
        </div>

        <div className={styles.legendGroup}>
          <span className={styles.legendTitle}>Merek Produk:</span>
          {Object.entries(BRAND_PALETTE).map(([b, pal]) => (
            <span key={b} className={styles.brandLegend}>
              <span className={styles.brandDot} style={{ background: pal.fill }} />
              <span>{b}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          className={styles.toggleTableBtn}
          onClick={() => setShowTable(v => !v)}
        >
          <span>{showTable ? "Sembunyikan Tabel" : "Lihat Daftar Lengkap Pasangan Barang"}</span>
          {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </footer>

      {/* Expandable Comprehensive Table */}
      {showTable && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>Pasangan Barang (A + B)</th>
                <th>Jumlah Nota</th>
                <th>Banyak Pembeli</th>
                <th>Beli A &rarr; Ikut Beli B</th>
                <th>Beli B &rarr; Ikut Beli A</th>
                <th>Kekuatan Pasangan</th>
                <th>Merek</th>
                <th>Saran Aksi untuk Toko</th>
              </tr>
            </thead>
            <tbody>
              {pasangan.top.slice(0, 10).map((p, i) => (
                <tr
                  key={p.id}
                  className={selectedPair?.id === p.id ? styles.rowSelected : ""}
                  onClick={() => setSelectedPair(p)}
                >
                  <td>{i + 1}</td>
                  <td>
                    <strong>{p.a}</strong>
                    <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>+ {p.b}</div>
                  </td>
                  <td><strong>{int(p.n)}</strong> nota</td>
                  <td>{int(p.pelanggan)} langganan</td>
                  <td>{p.pctA}%</td>
                  <td>{p.pctB}%</td>
                  <td>
                    <span className={p.lift >= 2.0 ? styles.badgeHighLift : styles.badgeNormalLift}>
                      {one(p.lift)}×
                    </span>
                  </td>
                  <td>
                    <span className={p.bedaMerek ? styles.tagCross : styles.tagSame}>
                      {p.bedaMerek ? "Beda Merek" : "Satu Merek"}
                    </span>
                  </td>
                  <td>
                    {p.lift >= 2.0 ? (
                      <span className={styles.actionRec}>🔥 Bikin Paket Bundling Promo</span>
                    ) : (
                      <span className={styles.actionNormal}>Pajang Berdampingan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
