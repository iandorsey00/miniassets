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
  "STORAGE",
  "SHELF",
  "DRAWER",
  "BIN",
  "BOX",
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

export const locationKindLabels: Record<
  (typeof locationNodeTypeValues)[number],
  { zh: string; en: string }
> = {
  HOUSE: { zh: "房屋", en: "House" },
  FLOOR: { zh: "楼层", en: "Floor" },
  ROOM: { zh: "房间", en: "Room" },
  AREA: { zh: "区域", en: "Area" },
  STORAGE: { zh: "储物单元", en: "Storage" },
  SHELF: { zh: "层架", en: "Shelf" },
  DRAWER: { zh: "抽屉", en: "Drawer" },
  BIN: { zh: "收纳盒", en: "Bin" },
  BOX: { zh: "箱子", en: "Box" },
  ROW: { zh: "行", en: "Row" },
  COLUMN: { zh: "列", en: "Column" },
  POSITION: { zh: "位置", en: "Position" },
};

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
