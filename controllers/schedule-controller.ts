import { Request, Response } from "express";
import { Controller, Code } from "./controller";
import { DB } from "../db";
import { Schedule } from "../models/schedule";
import { hasRoleForController as hasRole } from "../lib/rbac";
import { ROLE } from "../models/role";
import { ObjectID } from "mongodb";
import { Area, AppType } from "../models/area";
import { Status } from "../models/model";

@hasRole(ROLE.MERCHANT_ADMIN)
export class ScheduleController extends Controller {
  model: Schedule;
  areaModel: Area;
  constructor(model: Schedule, db: DB) {
    super(model, db);
    this.model = model;
    this.areaModel = new Area(db);
  }

  async show(req: Request, res: Response) {
    const { id } = req.params;
    let data;
    if (!id || id === "new") {
      data = null;
    } else {
      data = await this.model.findOne({ _id: new ObjectID(id) });
      if (!data) {
        return res.json({
          code: Code.FAIL,
          message: "No such schedule",
        });
      }
    }
    const areas = await this.areaModel.find({
      appType: AppType.GROCERY,
      status: Status.ACTIVE,
    });
    return res.json({
      code: Code.SUCCESS,
      data,
      meta: { areas },
    });
  }
}
