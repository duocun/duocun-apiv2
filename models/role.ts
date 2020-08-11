import { Model } from "./model";
import { EventLog } from "./event-log";
import { DB } from "../db";
import { IAccount } from "./account";

export enum ACCOUNT_TYPES {
  MERCHANT = "merchant",
  DRIVER = "driver",
  CLIENT = "client",
  SYSTEM = "system",
  FREIGHT = "freight",
  CUSTOMER_SERVICE = "customer service",
  STOCK_MANAGER = "stock manager",
  ADMIN = "admin",
}

export enum ATTRIBUTES {
  INDOOR = "I",
  GARDENING = "G",
  ROOFING = "R",
  OFFICE = "O",
  PLAZA = "P",
  HOUSE = "H",
  CONDO = "C",
}

export enum ROLE {
  SUPER = 1,
  MERCHANT_ADMIN = 2,
  MERCHANT_STUFF = 3,
  MANAGER = 4,
  DRIVER = 5,
  CLIENT = 6,
  CUSTOMER_SERVICE = 7,
  STORAGE_ADMIN = 8,
}

export enum RESOURCES {
  STATISTICS = "STATISTICS",
  CATEGORY = "CATEGORY",
  PRODUCT = "PRODUCT",
  ORDER = "ORDER",
  STOCK = "STOCK",
}

export enum PERMISSIONS {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export const RESOURCES_PERMISSIONS = {
  [RESOURCES.STATISTICS]: [PERMISSIONS.READ],
  [RESOURCES.CATEGORY]: [
    PERMISSIONS.READ,
    PERMISSIONS.CREATE,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE,
  ],
  [RESOURCES.PRODUCT]: [
    PERMISSIONS.READ,
    PERMISSIONS.CREATE,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE,
  ],
  [RESOURCES.ORDER]: [
    PERMISSIONS.READ,
    PERMISSIONS.CREATE,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE,
  ],
  [RESOURCES.STOCK]: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
};

export class Role extends Model {
  eventLogModel: EventLog;
  constructor(dbo: DB) {
    super(dbo, "roles");
    this.eventLogModel = new EventLog(dbo);
  }
  async findOne() {
    let role = await super.findOne({});
    if (!role) {
      role = DEFAULT_ROLES_PERMISSIONS;
      await this.insertOne(role);
      role = await super.findOne({});
    }
    return role;
  }
}

export type RBAC_DATA_TYPE = {
  [role in ROLE]?: {
    [resource in RESOURCES]?: Array<PERMISSIONS>;
  };
};

export const DEFAULT_ROLES_PERMISSIONS: RBAC_DATA_TYPE = {
  [ROLE.SUPER]: { ...RESOURCES_PERMISSIONS },
  [ROLE.MERCHANT_ADMIN]: {
    [RESOURCES.STATISTICS]: [],
    [RESOURCES.CATEGORY]: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    [RESOURCES.PRODUCT]: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    [RESOURCES.ORDER]: [
      PERMISSIONS.READ,
      PERMISSIONS.CREATE,
      PERMISSIONS.UPDATE,
      PERMISSIONS.DELETE,
    ],
    [RESOURCES.STOCK]: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },
  [ROLE.MERCHANT_STUFF]: {
    [RESOURCES.STATISTICS]: [],
    [RESOURCES.CATEGORY]: [PERMISSIONS.READ],
    [RESOURCES.PRODUCT]: [PERMISSIONS.READ],
    [RESOURCES.ORDER]: [PERMISSIONS.READ],
    [RESOURCES.STOCK]: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },
  [ROLE.MANAGER]: {},
  [ROLE.DRIVER]: {},
  [ROLE.CLIENT]: {},
  [ROLE.CUSTOMER_SERVICE]: {},
  [ROLE.STORAGE_ADMIN]: {
    [RESOURCES.STATISTICS]: [],
    [RESOURCES.CATEGORY]: [PERMISSIONS.READ],
    [RESOURCES.PRODUCT]: [PERMISSIONS.READ],
    [RESOURCES.ORDER]: [PERMISSIONS.READ],
    [RESOURCES.STOCK]: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },
};

export const hasRole = (user: IAccount | null | undefined, role: ROLE) => {
  if (!user || !user.roles) {
    return false;
  }
  return user.roles.includes(role);
};
