import { Request, Response } from "express";
import { IAccount } from "../models/account";
import { ROLE, RESOURCES, PERMISSIONS } from "../models/role";

type RequiredPermReturnType =
  | {
      __typename: string;
      perm: ROLE | { resource: RESOURCES; permission: PERMISSIONS };
    }
  | undefined;

export const rbac = (req: Request, res: Response, next: any) => {
  const user: IAccount = res.locals.user;
  const perm = getRequiredPermission(req.url, req.method);
  if (!perm) {
    return next();
  }
  if (!user || !user.roles) {
    return res.status(403).json({});
  }
  if (user.roles.includes(ROLE.SUPER)) {
    return next();
  }
  if (perm.__typename === "ROLE") {
    if ((user.roles || []).includes(perm.perm as ROLE)) {
      return next();
    } else {
      return res.status(403).json({});
    }
  }
  if (perm.__typename === "PERMISSION") {
    // TO DO: implement permission check
    return next();
  }
};

const getRequiredPermission = (
  url: string,
  method: string
): RequiredPermReturnType => {
  url = String(url).replace(`${process.env.ROUTE_PREFIX}`, "").split("?")[0];
  if (url === "accounts/login" || url === "/accounts/login") {
    return undefined;
  }
  if (url.startsWith("accounts")) {
    return {
      __typename: "ROLE",
      perm: ROLE.SUPER,
    };
  }
  if (url === "roles") {
    if (method === "GET") {
      return undefined;
    } else {
      return {
        __typename: "ROLE",
        perm: ROLE.SUPER,
      };
    }
  }
  return undefined;
};
