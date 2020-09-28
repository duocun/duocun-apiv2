import { Model } from "./model";
import { ObjectId } from "mongodb";
import { EventLog } from "./event-log";
import { DB } from "../db";
import _ from "lodash";

export enum PAYMENT_METHOD {
  ALPHAPAY = "alphapay",
  SNAPPAY = "snappay",
}

export type SettingType = {
  _id: string | ObjectId;
  payment_method: PAYMENT_METHOD;
};

export class Setting extends Model {
  eventLogModel: EventLog;
  constructor(dbo: DB) {
    super(dbo, "setting");
    this.eventLogModel = new EventLog(dbo);
  }

  async findOne() {
    let setting = await super.findOne({});
    if (!setting) {
      setting = DEFAULT_MODEL;
      await this.insertOne(setting);
      setting = await super.findOne({});
    }
    return setting;
  }

  async validate(doc: any, scope: "create" | "update") {
    const model: any = _.pick(doc, [
      "payment_method"
    ]);
    if (!model.payment_method) {
      throw new Error("payment_method field is required");
    }
    return model;
  }
}

export const DEFAULT_MODEL = {
  payment_method: PAYMENT_METHOD.SNAPPAY
};
