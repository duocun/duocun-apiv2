import { Request, Response } from "express";

import { Controller, Code } from "./controller";
import { Page } from "../models/page";
import { DB } from "../db";

import path from "path";
import { getLogger } from "../lib/logger";
import { hasRole } from "../lib/rbac";
import { ROLE } from "../models/role";

const logger = getLogger(path.basename(__filename));

export class PageController extends Controller {
  model: Page;
  constructor(model: Page, db: DB) {
    super(model, db);
    this.model = model;
  }

  @hasRole(ROLE.SUPER)
  async list(req: Request, res: Response) {
    return await super.list(req, res);
  }

  @hasRole(ROLE.SUPER)
  async create(req: Request, res: Response) {
    return await super.create(req, res);
  }

  @hasRole(ROLE.SUPER)
  async delete(req: Request, res: Response) {
    return await super.delete(req, res);
  }

  @hasRole(ROLE.SUPER)
  async save(req: Request, res: Response) {
    return await super.save(req, res);
  }

  @hasRole(ROLE.SUPER)
  async updateOne(req: Request, res: Response) {
    return await super.updateOne(req, res);
  }

  @hasRole(ROLE.SUPER)
  async get(req: Request, res: Response) {
    return await super.get(req, res);
  }

  @hasRole(ROLE.SUPER)
  async update(req: Request, res: Response): Promise<any> {
    let doc;
    try {
      doc = await this.model.validate(req.body.data, "update");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.toString(),
      });
    }
    try {
      await this.model.updateOne({ _id: doc._id }, doc);
    } catch (e) {
      console.error(e);
      return res.json({
        code: Code.FAIL,
        message: "save failed",
      });
    }
    res.json({
      code: Code.SUCCESS,
    });
  }
}
