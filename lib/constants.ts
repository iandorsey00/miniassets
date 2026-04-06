export const LOCALE_COOKIE = "miniassets_locale";
export const THEME_COOKIE = "miniassets_theme";
export const ACCENT_COOKIE = "miniassets_accent";
export const WORKSPACE_COOKIE = "miniassets_workspace";

export const accentValues = [
  "BLUE",
  "CYAN",
  "TEAL",
  "GREEN",
  "LIME",
  "YELLOW",
  "ORANGE",
  "RED",
  "PINK",
  "PURPLE",
] as const;

export const localeValues = ["ZH_CN", "EN"] as const;
export const themeValues = ["SYSTEM", "LIGHT", "DARK"] as const;
export const locationNodeTypeValues = [
  "HOUSE",
  "FLOOR",
  "ROOM",
  "AREA",
  "CABINET",
  "DRAWER",
  "SHELF",
  "CONTAINER",
  "ROW",
  "COLUMN",
  "POSITION",
] as const;
export const locationDescriptorTypeValues = ["WALL_ZONE", "FRONT_OF_ZONE"] as const;
export const wallDirectionValues = ["NORTH", "EAST", "SOUTH", "WEST"] as const;

export const accentTokenMap: Record<(typeof accentValues)[number], string> = {
  BLUE: "blue",
  CYAN: "cyan",
  TEAL: "teal",
  GREEN: "green",
  LIME: "lime",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
  PINK: "pink",
  PURPLE: "purple",
};

export const themeTokenMap: Record<(typeof themeValues)[number], string> = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
};

export const localeTokenMap: Record<(typeof localeValues)[number], string> = {
  ZH_CN: "zh-CN",
  EN: "en",
};

export type LocationKind = (typeof locationNodeTypeValues)[number];

export const locationKindLabels: Record<
  LocationKind,
  { zh: string; en: string }
> = {
  HOUSE: { zh: "房屋", en: "House" },
  FLOOR: { zh: "楼层", en: "Floor" },
  ROOM: { zh: "房间", en: "Room" },
  AREA: { zh: "区域", en: "Area" },
  CABINET: { zh: "柜体", en: "Cabinet" },
  DRAWER: { zh: "抽屉", en: "Drawer" },
  SHELF: { zh: "层架", en: "Shelf" },
  CONTAINER: { zh: "容器", en: "Container" },
  ROW: { zh: "行", en: "Row" },
  COLUMN: { zh: "列", en: "Column" },
  POSITION: { zh: "位置", en: "Position" },
};

export const topLevelLocationKinds = ["HOUSE"] as const;

export const numericCodeLocationKinds = ["CABINET", "DRAWER", "ROW", "COLUMN"] as const;

export const locationChildKindMap = {
  ROOT: ["HOUSE"],
  HOUSE: ["FLOOR", "ROOM", "AREA"],
  FLOOR: ["ROOM", "AREA"],
  ROOM: ["AREA", "CABINET", "DRAWER", "SHELF", "CONTAINER"],
  AREA: ["AREA", "CABINET", "DRAWER", "SHELF", "CONTAINER", "ROW", "COLUMN", "POSITION"],
  CABINET: ["DRAWER", "SHELF", "CONTAINER", "ROW", "COLUMN", "POSITION"],
  DRAWER: ["CONTAINER", "ROW", "COLUMN", "POSITION"],
  SHELF: ["CONTAINER", "ROW", "COLUMN", "POSITION"],
  CONTAINER: ["CONTAINER", "ROW", "COLUMN", "POSITION"],
  ROW: ["COLUMN", "POSITION"],
  COLUMN: ["POSITION"],
  POSITION: [],
} as const satisfies Record<string, readonly string[]>;

export const locationKindGroupMap = {
  STRUCTURE: ["HOUSE", "FLOOR", "ROOM", "AREA"],
  STORAGE: ["CABINET", "DRAWER", "SHELF", "CONTAINER"],
  COORDINATES: ["ROW", "COLUMN", "POSITION"],
} as const satisfies Record<string, readonly LocationKind[]>;

export const positionPresetValues = [
  "TOP",
  "BOTTOM",
  "LEFT",
  "RIGHT",
  "CENTER",
  "FRONT",
  "BACK",
  "INSIDE",
  "OUTSIDE",
  "OTHER",
] as const;

export const positionPresetLabels = {
  TOP: { zh: "上", en: "Top" },
  BOTTOM: { zh: "下", en: "Bottom" },
  LEFT: { zh: "左", en: "Left" },
  RIGHT: { zh: "右", en: "Right" },
  CENTER: { zh: "中", en: "Center" },
  FRONT: { zh: "前", en: "Front" },
  BACK: { zh: "后", en: "Back" },
  INSIDE: { zh: "内", en: "Inside" },
  OUTSIDE: { zh: "外", en: "Outside" },
  OTHER: { zh: "其他", en: "Other" },
} as const;

export function getAllowedLocationKindsByGroup(parentKind: LocationKind | null) {
  const allowedKinds = getAllowedLocationKinds(parentKind);

  return Object.entries(locationKindGroupMap)
    .map(([group, kinds]) => ({
      group,
      kinds: kinds.filter((kind) => allowedKinds.includes(kind)),
    }))
    .filter((entry) => entry.kinds.length);
}

export function getAllowedLocationKinds(parentKind: LocationKind | null) {
  return (parentKind ? locationChildKindMap[parentKind] : locationChildKindMap.ROOT) as readonly LocationKind[];
}

export function isLocationKindAllowedUnderParent(
  parentKind: LocationKind | null,
  childKind: LocationKind,
) {
  return getAllowedLocationKinds(parentKind).includes(childKind);
}

export function isNumericCodeLocationKind(kind: LocationKind) {
  return (numericCodeLocationKinds as readonly string[]).includes(kind);
}

export const locationDescriptorTypeLabels = {
  WALL_ZONE: { zh: "墙面区域", en: "Wall zone" },
  FRONT_OF_ZONE: { zh: "前方区域", en: "In front of zone" },
} as const;

export const wallDirectionLabels = {
  NORTH: { zh: "北墙", en: "North wall" },
  EAST: { zh: "东墙", en: "East wall" },
  SOUTH: { zh: "南墙", en: "South wall" },
  WEST: { zh: "西墙", en: "West wall" },
} as const;

export const sensitivityLabels = {
  LOW: { zh: "低", en: "Low" },
  MEDIUM: { zh: "中", en: "Medium" },
} as const;

export const trackingModeLabels = {
  INDIVIDUAL: { zh: "单件", en: "Individual" },
  GROUP: { zh: "分组", en: "Group" },
} as const;

export const assetUsageStateLabels = {
  STORAGE: { zh: "储存中", en: "Storage" },
  IN_USE: { zh: "使用中", en: "In use" },
} as const;

export const capacityUnitValues = ["ML", "L"] as const;
export const capacityUnitLabels = {
  ML: { zh: "毫升", en: "mL" },
  L: { zh: "升", en: "L" },
} as const;

export const netWeightUnitValues = ["G", "KG"] as const;
export const netWeightUnitLabels = {
  G: { zh: "克", en: "g" },
  KG: { zh: "千克", en: "kg" },
} as const;

export const assetStatusLabels = {
  ACTIVE: { zh: "在管", en: "Active" },
  MISSING: { zh: "待寻找", en: "Missing" },
  ARCHIVED: { zh: "归档", en: "Archived" },
} as const;

export const placementConfidenceLabels = {
  VERIFIED: { zh: "已确认", en: "Verified" },
  ASSUMED: { zh: "推定", en: "Assumed" },
  REPORTED: { zh: "口头报告", en: "Reported" },
} as const;

export const commonColorValues = [
  "Black",
  "Blue",
  "Brown",
  "Clear",
  "Gold",
  "Gray",
  "Green",
  "Orange",
  "Pink",
  "Purple",
  "Red",
  "Silver",
  "White",
  "Yellow",
] as const;

export const commonColorLabels: Record<(typeof commonColorValues)[number], { zh: string; en: string }> = {
  Black: { zh: "黑色", en: "Black" },
  Blue: { zh: "蓝色", en: "Blue" },
  Brown: { zh: "棕色", en: "Brown" },
  Clear: { zh: "透明", en: "Clear" },
  Gold: { zh: "金色", en: "Gold" },
  Gray: { zh: "灰色", en: "Gray" },
  Green: { zh: "绿色", en: "Green" },
  Orange: { zh: "橙色", en: "Orange" },
  Pink: { zh: "粉色", en: "Pink" },
  Purple: { zh: "紫色", en: "Purple" },
  Red: { zh: "红色", en: "Red" },
  Silver: { zh: "银色", en: "Silver" },
  White: { zh: "白色", en: "White" },
  Yellow: { zh: "黄色", en: "Yellow" },
};
