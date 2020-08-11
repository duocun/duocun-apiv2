import { Request, Response } from "express";
import { getLogger } from "../lib/logger";
import path from "path";
import { Controller, Code } from "./controller";
import { Role, ROLE } from "../models/role";
import { DB } from "../db";
import cfg from "../config";
import { DEFAULT_ROLES_PERMISSIONS } from "../models/role";
import cache from "../lib/cache";
import { hasRole } from "../lib/rbac";

const logger = getLogger(path.basename(__filename));

export class RoleController extends Controller {
  model: Role;

  constructor(model: Role, db: DB) {
    super(model, db);
    this.model = model;
  }
  
  @hasRole(ROLE.SUPER)
  async show(req: Request, res: Response) {
    let role;
    try {
      role = await this.model.findOne();
      return res.json({
        code: Code.SUCCESS,
        data: role,
      });
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.message,
      });
    }
  }

  @hasRole(ROLE.SUPER)
  async save(req: Request, res: Response) {
    let role = req.body.data;
    if (!role) {
      return res.json({
        code: Code.FAIL,
        message: "Role data is empty",
      });
    }
    const oldRole = await this.model.findOne();
    await this.model.updateOne({ _id: oldRole._id }, role);
    role = await this.model.findOne();
    cache.set("ROLE_PERMISSION", role);
    return res.json({
      code: Code.SUCCESS,
      data: role,
    });
  }
}
