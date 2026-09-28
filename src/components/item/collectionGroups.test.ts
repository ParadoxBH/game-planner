import { describe, expect, it } from "vitest";
import type { CollectionGroupDocument } from "../../api/content";
import { groupPayload, isMember } from "./collectionGroups";

const group = {
  extId: "armor_bronze",
  name: "Bronze",
  summary: null,
  description: null,
  media: [{ usage: "icon", mediaId: "abc" }],
  collections: ["armor"],
  members: [{ kind: "item", extId: "HelmetBronze" }],
  events: [],
  ordinal: 2,
} as unknown as CollectionGroupDocument;

describe("groupPayload", () => {
  it("writes the group without media and keeps the ordinal unless changed", () => {
    const payload = groupPayload(group);
    expect(payload).not.toHaveProperty("media");
    expect(payload.ordinal).toBe(2);
    expect(payload.collections).toEqual(["armor"]);
  });

  it("replaces only the given fields", () => {
    const members = [...group.members, { kind: "item", extId: "ArmorBronzeChest" }];
    expect(groupPayload(group, { members }).members).toEqual(members);
    expect(groupPayload(group, { ordinal: 0 }).ordinal).toBe(0);
  });
});

describe("isMember", () => {
  it("matches by code and kind, and a member without kind matches any kind", () => {
    const target = { kind: "item", extId: "HelmetBronze" };
    expect(isMember({ kind: "item", extId: "HelmetBronze" }, target)).toBe(true);
    expect(isMember({ kind: "entity", extId: "HelmetBronze" }, target)).toBe(false);
    expect(isMember({ kind: null, extId: "HelmetBronze" }, target)).toBe(true);
    expect(isMember({ extId: "HelmetBronze" }, target)).toBe(true);
    expect(isMember({ kind: "item", extId: "HelmetIron" }, target)).toBe(false);
  });
});
