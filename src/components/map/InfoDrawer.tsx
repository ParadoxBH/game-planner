import { useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircularProgress, Stack, Typography } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import MapIcon from "@mui/icons-material/Map";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { ApiError } from "../../api/ApiError";
import type {
  EntityDocument,
  EntityRelated,
  ItemDocument,
  ItemRelated,
  MediaLink,
  Reference,
  SpawnPointDocument,
} from "../../api/content";
import { contentRoute, currentMedia, ReferenceIndex, sameTarget } from "../../api/references";
import { useContentDetails } from "../../api/useContent";
import { formatAmount, formatChance, formatRange } from "../../utils/format";
import { BaseDrawer } from "../BaseDrawer";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { ReferenceChips } from "../common/DetailField";
import type { NavigationItem } from "./MapView";

interface PanelProps {
  gameId: string;
  id: string;
  onPush: (item: NavigationItem) => void;
  onSelectMap: (mapId: string) => void;
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {icon}
        <Typography variant="subtitle2">{title}</Typography>
      </Stack>
      {children}
    </Stack>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
      {text}
    </Typography>
  );
}

function PanelState({ error, id }: { error: Error | null; id: string }) {
  if (!error) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress color="primary" />
      </Stack>
    );
  }
  const unregistered = error instanceof ApiError && error.kind === "unregistered-content";
  return <Empty text={unregistered ? `"${id}" ainda não foi cadastrado.` : error.message} />;
}

function Header({
  kind,
  document,
  categories,
  references,
}: {
  kind: "item" | "entity";
  document: { extId: string; name: string; media: MediaLink[] };
  categories: string[];
  references: ReferenceIndex;
}) {
  const iconMediaId = currentMedia(document.media, "icon") ?? currentMedia(document.media, "screenshot");
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <ContentChip
        target={{ kind, extId: document.extId }}
        resolved={{ kind, extId: document.extId, resolvedKind: kind, name: document.name, iconMediaId }}
        size="large"
        disableLink
      />
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
          {document.name}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
          {document.extId}
        </Typography>
        {categories.length > 0 && (
          <ReferenceChips targets={categories.map((id) => ({ kind: "category", extId: id }))} references={references} />
        )}
      </Stack>
    </Stack>
  );
}

/** Alvo citado (requisito ou drop): abre o resumo dele no drawer quando é item ou entidade. */
function TargetRow({
  target,
  references,
  caption,
  label,
  onPush,
}: {
  target: Reference;
  references: ReferenceIndex;
  caption?: string;
  label?: string;
  onPush: (item: NavigationItem) => void;
}) {
  const resolved = references.find(target);
  const kind = resolved?.resolvedKind ?? target.kind;
  const type = kind === "entity" || kind === "item" ? kind : null;
  return (
    <DataCard
      onClick={type ? () => onPush({ type, id: target.extId }) : undefined}
      sx={{ p: 1.5, gap: 1.5, justifyContent: "space-between" }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <ContentChip target={target} resolved={resolved} size="small" disableLink />
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {references.name(target)}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Stack>
      </Stack>
      {label && <DataChip label={label} />}
    </DataCard>
  );
}

/** Pontos agrupados por mapa; escolher um abre o mapa. */
function MapOccurrences({
  points,
  references,
  onSelectMap,
}: {
  points: SpawnPointDocument[];
  references: ReferenceIndex;
  onSelectMap: (mapId: string) => void;
}) {
  const counts = new Map<string, Set<string>>();
  points.forEach((point) => {
    if (point.map) counts.set(point.map, (counts.get(point.map) ?? new Set()).add(point.extId));
  });
  if (counts.size === 0) return <Empty text="Nenhum ponto registrado nos mapas." />;
  return (
    <Stack spacing={1}>
      {[...counts.entries()]
        .sort((a, b) => b[1].size - a[1].size)
        .map(([map, ids]) => (
          <DataCard key={map} onClick={() => onSelectMap(map)} sx={{ p: 1.5, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <MapIcon sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography variant="body2" fontWeight={600}>
                {references.name({ kind: "map", extId: map })}
              </Typography>
            </Stack>
            <DataChip label={`${ids.size}x`} />
          </DataCard>
        ))}
    </Stack>
  );
}

function EntityPanel({ gameId, id, onPush, onSelectMap }: PanelProps) {
  const navigate = useNavigate();
  const details = useContentDetails<EntityDocument, EntityRelated>(gameId, "entities", id);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);
  if (!details.data) return <PanelState error={details.error} id={id} />;

  const { document: entity, related } = details.data;
  return (
    <Stack spacing={3}>
      <Header kind="entity" document={entity} categories={entity.categories} references={references} />

      {related.shops.content.length > 0 && (
        <Section icon={<StorefrontIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Loja">
          <Stack spacing={1}>
            {related.shops.content.map((shop) => (
              <DataCard
                key={shop.extId}
                onClick={() => navigate(contentRoute(gameId, "shop", shop.extId)!)}
                sx={{ p: 1.5, justifyContent: "space-between" }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {shop.name}
                </Typography>
                <DataChip label="Abrir" color="primary" />
              </DataCard>
            ))}
          </Stack>
        </Section>
      )}

      {entity.requirements.length > 0 && (
        <Section icon={<TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Requisitos de coleta">
          <Stack spacing={1}>
            {entity.requirements.map((requirement, index) => (
              <TargetRow
                key={index}
                target={requirement.target}
                references={references}
                caption={requirement.notConsumed ? "Não é gasto" : undefined}
                label={`x${formatAmount(requirement.amount)}`}
                onPush={onPush}
              />
            ))}
          </Stack>
        </Section>
      )}

      <Section icon={<InventoryIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Drops">
        {entity.drops.length > 0 ? (
          <Stack spacing={1}>
            {entity.drops.map((drop, index) => (
              <TargetRow
                key={index}
                target={drop.target}
                references={references}
                caption={formatChance(drop.chance)}
                label={`${formatRange(drop.amount, drop.maxAmount)}x`}
                onPush={onPush}
              />
            ))}
          </Stack>
        ) : (
          <Empty text="Nenhum drop registrado." />
        )}
      </Section>

      <Section icon={<MapIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Mapas">
        <MapOccurrences points={related.spawnPoints.content} references={references} onSelectMap={onSelectMap} />
      </Section>
    </Stack>
  );
}

function ItemPanel({ gameId, id, onPush, onSelectMap }: PanelProps) {
  const details = useContentDetails<ItemDocument, ItemRelated>(gameId, "items", id);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);
  if (!details.data) return <PanelState error={details.error} id={id} />;

  const { document: item, related } = details.data;
  const self: Reference = { kind: "item", extId: item.extId };
  return (
    <Stack spacing={3}>
      <Header kind="item" document={item} categories={item.categories} references={references} />

      {(item.summary || item.description) && (
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          {item.summary ?? item.description}
        </Typography>
      )}

      <Section icon={<TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Dropado por">
        {related.droppedBy.content.length > 0 ? (
          <Stack spacing={1}>
            {related.droppedBy.content.map((entity) => {
              const drop = entity.drops.find((candidate) => sameTarget(candidate.target, self));
              return (
                <DataCard
                  key={entity.extId}
                  onClick={() => onPush({ type: "entity", id: entity.extId })}
                  sx={{ p: 1.5, gap: 1.5, justifyContent: "space-between" }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <ContentChip
                      target={{ kind: "entity", extId: entity.extId }}
                      resolved={{
                        kind: "entity",
                        extId: entity.extId,
                        resolvedKind: "entity",
                        name: entity.name,
                        iconMediaId: currentMedia(entity.media, "icon") ?? currentMedia(entity.media, "screenshot"),
                      }}
                      size="small"
                      disableLink
                    />
                    <Stack sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {entity.name}
                      </Typography>
                      {drop && (
                        <Typography variant="caption" color="text.secondary">
                          {formatChance(drop.chance)}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                  {drop && <DataChip label={`${formatRange(drop.amount, drop.maxAmount)}x`} />}
                </DataCard>
              );
            })}
          </Stack>
        ) : (
          <Empty text="Nenhuma entidade dropa este item." />
        )}
      </Section>

      <Section icon={<MapIcon sx={{ color: "primary.main", fontSize: 20 }} />} title="Mapas">
        <MapOccurrences
          points={[...related.dropPoints.content, ...related.spawnPoints.content]}
          references={references}
          onSelectMap={onSelectMap}
        />
      </Section>
    </Stack>
  );
}

interface InfoDrawerProps {
  stack: NavigationItem[];
  onSelectMap: (mapId: string) => void;
  onPush: (item: NavigationItem) => void;
  onPop: () => void;
  onClose: () => void;
}

/** Resumo de item ou entidade ao lado do mapa, lido do agregado /details, com pilha para ir e voltar. */
export const InfoDrawer = ({ stack, onSelectMap, onPush, onPop, onClose }: InfoDrawerProps) => {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const current = stack[stack.length - 1];
  if (!current) return null;

  return (
    <BaseDrawer
      title={current.type === "entity" ? "Entidade" : "Item"}
      onClose={onClose}
      onPop={onPop}
      onViewDetails={() => navigate(contentRoute(gameId, current.type, current.id)!)}
      showBackButton={stack.length > 1}
    >
      {current.type === "entity" ? (
        <EntityPanel key={`entity-${current.id}`} gameId={gameId} id={current.id} onPush={onPush} onSelectMap={onSelectMap} />
      ) : (
        <ItemPanel key={`item-${current.id}`} gameId={gameId} id={current.id} onPush={onPush} onSelectMap={onSelectMap} />
      )}
    </BaseDrawer>
  );
};
