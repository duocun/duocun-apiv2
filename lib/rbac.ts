import { Request, Response } from "express";
import { ROLE, RESOURCES, PERMISSIONS, RBAC_DATA_TYPE } from "../models/role";
import cache from "../lib/cache";

type RequiredPermissionType =
  | ROLE
  | { resource?: RESOURCES; permission?: PERMISSIONS };

export function hasRole(required?: RequiredPermissionType) {
  if (!required) {
    return function (
      target: Object,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const className = target.constructor.name;
      const originalMethod = descriptor.value;
      descriptor.value = function (req: Request, res: Response) {
        const resource = getResourceFromClassName(className);
        const permission = getPermissionFromRequestMethod(req.method);
        const user = res.locals.user;
        if (!checkHasRole(user, { resource, permission })) {
          res.status(403).json({});
        } else {
          originalMethod.apply(this, [req, res]);
        }
      };
      return descriptor;
    };
  }
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (req: Request, res: Response) {
      const user = res.locals.user;
      if (!checkHasRole(user, required)) {
        res.status(403).json({});
      } else {
        originalMethod.apply(this, [req, res]);
      }
    };
    return descriptor;
  };
}

export function hasRoleForController(required: RequiredPermissionType) {
  return function (target: Function) {
    for (const key of [
      // CRUD operators defined in Controller
      "list",
      "get",
      "updateOne",
      "update",
      "save",
      "delete",
      "create",
    ]) {
      let descriptor = Object.getOwnPropertyDescriptor(
        target.prototype,
        key
      );
      if (descriptor) {
        descriptor = hasRole(required)(target, key, descriptor);
        Object.defineProperty(target.prototype, key, descriptor);
      }
    }
  };
}

export const checkHasRole = (
  user: { roles: Array<ROLE> } | undefined | null,
  role: RequiredPermissionType | undefined | null,
  rbac?: RBAC_DATA_TYPE
): boolean => {
  if (!role) {
    return true;
  }
  if (!user || !user.roles) {
    return false;
  }
  if (user.roles.includes(ROLE.SUPER)) {
    return true;
  }
  if (typeof role === "object") {
    if (!role.resource || !role.permission) {
      return false;
    }
    rbac = rbac || (cache.get("ROLE_PERMISSION") as RBAC_DATA_TYPE);
    for (const r of user.roles) {
      if ((rbac?.[r]?.[role.resource] || []).includes(role.permission)) {
        return true;
      }
    }
    return false;
  }
  return user.roles.includes(role as ROLE);
};

export const getResourceFromClassName = (
  className: string
): RESOURCES | undefined => {
  if (!className) {
    return undefined;
  }
  const resource = className.replace(/controller/gi, "").toUpperCase();
  //@ts-ignore
  return RESOURCES[resource];
};

export const getPermissionFromRequestMethod = (
  method: string
): PERMISSIONS | undefined => {
  if (method === "GET") {
    return PERMISSIONS.READ;
  }
  if (method === "POST") {
    return PERMISSIONS.CREATE;
  }
  if (method === "PUT") {
    return PERMISSIONS.UPDATE;
  }
  if (method === "DELETE") {
    return PERMISSIONS.DELETE;
  }
  return undefined;
};
