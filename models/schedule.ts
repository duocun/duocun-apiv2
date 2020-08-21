import { ObjectID } from "mongodb";

import { Model } from "./model";
import { EventLog } from "./event-log";
import { DB } from "../db";
import moment from "moment";
import _ from "lodash";

export type ScheduleType = {
  _id: string | ObjectID;
  title: string;
  description: string;
  merchantId?: string | ObjectID;
  startDate: Date;
  endDate: Date;
  endTimeMargin: number;
  areas: Array<AreaScheduleType>;
};

export type AreaScheduleType = {
  areaId: string | ObjectID;
  periods: Array<PeriodScheduleType>;
};

export type PeriodScheduleType = {
  startDate: Date;
  endDate: Date;
  dows: Array<number>;
};

export const DEFAULT_MODEL = {
  _id: "new",
  title: "",
  description: "",
  areas: [],
  endTimeMargin: 0,
  startDate: moment(),
  endDate: moment().add("+6", "days"),
};

export class Schedule extends Model {
  eventLogModel: EventLog;
  constructor(dbo: DB) {
    super(dbo, "schedules");
    this.eventLogModel = new EventLog(dbo);
  }

  async validate(doc: any, scope: "create" | "update") {
    const model: any = _.pick(doc, [
      "title",
      "description",
      "areas",
      "endTimeMargin",
      "startDate",
      "endDate",
      "appType",
      "status"
    ]);
    return model;
  }
}
