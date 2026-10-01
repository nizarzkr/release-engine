import "server-only";
import path from "node:path";
import {
  Document,
  Font,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  SCOPE_TITLES,
  type ExportContent,
  type ExportScope,
  type ReleaseExport,
} from "@/lib/domain/export";

// Charte Release Engine (thème clair « crème », cf. globals.css).
const C = {
  background: "#f6f3ec",
  card: "#ffffff",
  ink: "#22201c",
  muted: "#8a857a",
  border: "#ebe6db",
  soft: "#f0ece2",
  primary: "#1e8a5f",
  primarySoft: "#e3f1ea",
};

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "Inter-400.woff"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Inter-600.woff"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "Inter-700.woff"), fontWeight: 700 },
  ],
});
// Pas de césure automatique : les mots français restent entiers.
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: {
    backgroundColor: C.background,
    color: C.ink,
    fontFamily: "Inter",
    fontSize: 9.5,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  brand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brandName: { fontSize: 10, fontWeight: 700, letterSpacing: -0.2 },
  brandDot: { color: C.primary },
  brandMeta: { fontSize: 8, color: C.muted },
  hero: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: { fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.4 },
  heroMeta: { flexDirection: "row", gap: 14, marginTop: 8 },
  heroMetaItem: { fontSize: 9, color: C.muted },
  heroMetaStrong: { color: C.ink, fontWeight: 600 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  card: {
    backgroundColor: C.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLast: { borderBottomWidth: 0 },
  groupLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#ded8cb",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: C.primary, borderColor: C.primary },
  grow: { flex: 1 },
  done: { color: C.muted, textDecoration: "line-through" },
  date: { fontSize: 8.5, color: C.muted, marginLeft: 8 },
  pill: {
    fontSize: 7.5,
    fontWeight: 600,
    color: C.primary,
    backgroundColor: C.primarySoft,
    borderRadius: 8,
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    marginRight: 8,
  },
  offsetPill: { width: 40, textAlign: "center" },
  content: {
    backgroundColor: C.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
  },
  contentHead: { flexDirection: "row", alignItems: "flex-start" },
  contentTitle: { fontSize: 10.5, fontWeight: 600, flex: 1 },
  contentMeta: { fontSize: 8.5, color: C.muted, marginTop: 3 },
  tag: {
    fontSize: 7.5,
    color: C.muted,
    backgroundColor: C.soft,
    borderRadius: 8,
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  field: { marginTop: 7 },
  fieldLabel: {
    fontSize: 7.5,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  empty: { fontSize: 9, color: C.muted, padding: 10 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: C.muted,
  },
});

function Checklist({ data }: { data: ReleaseExport }) {
  const phases = [...new Set(data.checklist.map((t) => t.phase))];
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>
        Checklist · {data.checklist.filter((t) => t.done).length}/
        {data.checklist.length}
      </Text>
      {data.checklist.length === 0 && (
        <View style={s.card}>
          <Text style={s.empty}>Aucune tâche.</Text>
        </View>
      )}
      {phases.map((phase) => {
        const tasks = data.checklist.filter((t) => t.phase === phase);
        return (
          <View key={phase} style={{ marginBottom: 8 }}>
            <Text style={s.groupLabel}>{phase}</Text>
            <View style={s.card}>
              {tasks.map((t, i) => (
                <View
                  key={i}
                  wrap={false}
                  style={[s.row, i === tasks.length - 1 ? s.rowLast : {}]}
                >
                  <View style={[s.check, t.done ? s.checkDone : {}]}>
                    {t.done && (
                      <Svg width={7} height={7} viewBox="0 0 24 24">
                        <Path
                          d="M4 12.5l5 5L20 6.5"
                          stroke="#ffffff"
                          strokeWidth={4}
                          fill="none"
                        />
                      </Svg>
                    )}
                  </View>
                  <Text style={[s.grow, t.done ? s.done : {}]}>{t.label}</Text>
                  {t.date && <Text style={s.date}>{t.date}</Text>}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Milestones({ data }: { data: ReleaseExport }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Jalons</Text>
      <View style={s.card}>
        {data.milestones.length === 0 && (
          <Text style={s.empty}>Aucun jalon.</Text>
        )}
        {data.milestones.map((m, i) => (
          <View
            key={i}
            wrap={false}
            style={[s.row, i === data.milestones.length - 1 ? s.rowLast : {}]}
          >
            <Text style={[s.pill, s.offsetPill]}>{m.offset}</Text>
            <Text style={[s.grow, { fontWeight: 600 }]}>{m.label}</Text>
            <Text style={s.date}>{m.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BriefField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function ContentBlock({ c }: { c: ExportContent }) {
  const meta = [c.date || "Non daté", c.platform, c.format, c.objective]
    .filter(Boolean)
    .join(" · ");
  const origin = [
    c.milestone && `Jalon : ${c.milestone}`,
    c.source && `Tournage : ${c.source}`,
    c.tags && `Tags : ${c.tags}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={s.content} wrap={false}>
      <View style={s.contentHead}>
        <Text style={s.contentTitle}>{c.hook || c.theme}</Text>
        <Text style={s.pill}>{c.status}</Text>
        {c.archived && <Text style={s.tag}>Archivé</Text>}
      </View>
      <Text style={s.contentMeta}>
        {c.hook ? `${c.theme} · ` : ""}
        {meta}
      </Text>
      {origin && <Text style={s.contentMeta}>{origin}</Text>}
      <BriefField label="Concept" value={c.concept} />
      <BriefField label="Structure" value={c.structure} />
      <BriefField label="Son suggéré" value={c.sound} />
      <BriefField label="CTA" value={c.cta} />
    </View>
  );
}

function Contents({ data }: { data: ReleaseExport }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Contenus · {data.contents.length}</Text>
      {data.contents.length === 0 && (
        <View style={s.card}>
          <Text style={s.empty}>Aucun contenu.</Text>
        </View>
      )}
      {data.contents.map((c, i) => (
        <ContentBlock key={i} c={c} />
      ))}
    </View>
  );
}

function ReleaseDocument({
  data,
  scope,
}: {
  data: ReleaseExport;
  scope: ExportScope;
}) {
  const showChecklist = scope !== "timeline";
  const showTimeline = scope !== "checklist";
  return (
    <Document title={`${SCOPE_TITLES[scope]} — ${data.release.title}`} author="Release Engine">
      <Page size="A4" style={s.page}>
        <View style={s.brand} fixed>
          <Text style={s.brandName}>
            Release Engine<Text style={s.brandDot}>.</Text>
          </Text>
          <Text style={s.brandMeta}>{data.release.title}</Text>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>{SCOPE_TITLES[scope]}</Text>
          <Text style={s.title}>{data.release.title}</Text>
          <View style={s.heroMeta}>
            <Text style={s.heroMetaItem}>
              Sortie <Text style={s.heroMetaStrong}>{data.release.date}</Text>
            </Text>
            <Text style={s.heroMetaItem}>
              <Text style={s.heroMetaStrong}>{data.release.type}</Text>
            </Text>
            {data.release.template && (
              <Text style={s.heroMetaItem}>
                Format{" "}
                <Text style={s.heroMetaStrong}>{data.release.template}</Text>
              </Text>
            )}
          </View>
        </View>

        {showChecklist && <Checklist data={data} />}
        {showTimeline && <Milestones data={data} />}
        {showTimeline && <Contents data={data} />}

        <View style={s.footer} fixed>
          <Text>Exporté le {data.generatedOn} · Release Engine</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export function renderReleasePdf(
  data: ReleaseExport,
  scope: ExportScope,
): Promise<Buffer> {
  return renderToBuffer(<ReleaseDocument data={data} scope={scope} />);
}
