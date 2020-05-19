import { Request, Response } from "express";

import { Controller, Code } from "./controller";
import { Page } from "../models/page";
import { DB } from "../db";

import path from "path";
import { getLogger } from "../lib/logger";
const logger = getLogger(path.basename(__filename));

export class PageController extends Controller {
  model: Page
  constructor(model: Page, db: DB) {
    super(model, db);
    this.model = model;
  }
  async update(req: Request, res: Response): Promise<any> {
    const doc = req.body.data;
    try {
      await this.model.validate(doc, "update");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.toString()
      });
    }
    try {
      await this.model.updateOne({ _id: doc._id }, doc);
    } catch (e) {
      console.error(e);
      return res.json({
        code: Code.FAIL,
        message: "save failed"
      });
    }
    res.json({
      code: Code.SUCCESS
    })
  }
}