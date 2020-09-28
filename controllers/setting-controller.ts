import { Request, Response } from "express";
import { getLogger } from "../lib/logger";
import path from "path";
import { Controller, Code } from "./controller";
import { DB } from "../db";
import cfg from "../config";
import { Setting } from "../models/setting";
import { hasRole } from "../lib/rbac";
import { ROLE } from "../models/role";

const logger = getLogger(path.basename(__filename));

export class SettingController extends Controller {
  model: Setting;

  constructor(model: Setting, db: DB) {
    super(model, db);
    this.model = model;
  }

  async show(req: Request, res: Response) {
    let setting;
    try {
      setting = await this.model.findOne();
      return res.json({
        code: Code.SUCCESS,
        data: setting,
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
    let setting = req.body.data;
    if (!setting) {
      return res.json({
        code: Code.FAIL,
        message: "Setting data is empty",
      });
    }
    const oldSetting = await this.model.findOne();
    await this.model.updateOne({ _id: oldSetting._id }, setting);
    return res.json({
      code: Code.SUCCESS,
      data: setting,
    });
  }
}
