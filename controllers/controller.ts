import { Request, Response } from "express";
import { Model } from "../models/model";
import { DB } from "../db";
import path from "path";
import { getLogger } from "../lib/logger";
import { IAccount } from "../models/account";
import { hasRole } from "../models/role";
import { ROLE } from "../models/role";
import { ObjectID, ObjectId } from "mongodb";
import { join } from "lodash";

const logger = getLogger(path.basename(__filename));

export const Code = {
  SUCCESS: "success",
  FAIL: "fail",
};

export class Controller {
  public model: Model;
  public db: DB;
  constructor(model: any, db: DB) {
    this.model = model;
    this.db = db;
  }

  getCurrentUser(res: Response): IAccount | null {
    return res.locals.user;
  }

  async list(req: Request, res: Response): Promise<any> {
    const where: any = req.query.where;
    const options: any = req.query.options;
    let data: any[] = [];
    let count: number = 0;
    let code = Code.FAIL;
    const user = this.getCurrentUser(res) as IAccount;
    if (!hasRole(user, ROLE.SUPER)) {
      where.merchantId = new ObjectID(user._id);
    }
    try {
      if (where) {
        // console.log(`query: ${where}`);
        // TODO: no where will return error, is it a good choice?
        const r = await this.model.find_v2(where, options);
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      } else {
        const r = await this.model.find_v2({}, options);
        code = Code.SUCCESS;
        data = r.data;
        count = r.count;
      }
      res.setHeader("Content-Type", "application/json");
      res.send({
        code: code,
        data: data,
        count: count,
      });
    } catch (error) {
      console.log(`list error: ${error.message}`);
      logger.error(`list error: ${error}`);
    }
  }

  async get(req: Request, res: Response): Promise<any> {
    const id = req.params.id;
    const options: any = (req.query && req.query.options) || {};
    const data = await this.model.getById(id, options);
    if (!data) {
      res.json({
        code: Code.FAIL,
        message: "not found",
      });
      return;
    }
    res.json({
      code: Code.SUCCESS,
      data
    });
    return;
  }

  async updateOne(req: Request, res: Response): Promise<any> {
    const _id = req.params.id;
    let updates;
    try {
      updates = await this.model.validate(req.body.data, "update");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.toString(),
      });
		}
		const where: any = { _id };
		const user = res.locals.user;
		if (!hasRole(user, ROLE.SUPER)) {
			where.merchantId = new ObjectID(user._id);
		}
		const exists = await this.model.findOne(where);
		if (!exists) {
			return res.json({
				code: Code.FAIL,
				message: 'model does not exists or does not belong to user'
			});
		}
    const r = await this.model.updateOne(where, updates);
    const data = await this.model.findOne({ _id });
    return res.json({
      code: Code.SUCCESS,
      data,
    });
  }

  // alias to updateOne
  async update(req: Request, res: Response) {
    return this.updateOne(req, res);
  }

  async create(req: Request, res: Response): Promise<any> {
    let doc;
    try {
      doc = await this.model.validate(req.body.data, "create");
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e.toString(),
      });
		}
		const user = res.locals.user;
		if (!hasRole(user, ROLE.SUPER) && hasRole(user, ROLE.MERCHANT_ADMIN)) {
			//@ts-ignore
      doc.merchantId = new ObjectID(user._id);
    }
    try {
      const data = await this.model.insertOne(doc);
      return res.json({
        code: Code.SUCCESS,
        data,
      });
    } catch (e) {
      console.error(e);
      logger.error(`create error: ${e}`);
      return res.json({
        code: Code.FAIL,
        message: "save failed",
      });
    }
  }

  async delete(req: Request, res: Response) {
		const _id = req.params.id;
		const user = res.locals.user;
		if (!hasRole(user, ROLE.SUPER)) {
			const existing = await this.model.findOne({ _id, merchantId: new ObjectId(user._id) });
			if (!existing) {
				return res.json({
					code: Code.FAIL,
					message: 'model does not exist or does not belong to user'
				});
			}
		}
    try {
      await this.model.deleteById(_id);
      return res.json({
        code: Code.SUCCESS,
      });
    } catch (e) {
      return res.json({
        code: Code.FAIL,
        message: e,
      });
    }
  }

  async save(req: Request, res: Response) {
    const id = req.params.id;
    if (id && id !== "new") {
      return await this.update(req, res);
    } else {
      return await this.create(req, res);
    }
  }
}
