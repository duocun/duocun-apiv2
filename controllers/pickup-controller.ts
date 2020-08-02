import express from "express";
import { DB } from "../db";
import { Pickup } from "../models/pickup";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";

import path from "path";
import { getLogger } from "../lib/logger";
const logger = getLogger(path.basename(__filename));

export class PickupController extends Controller {
  model: Pickup;

  constructor(model: Pickup, db: DB) {
    super(model, db);
    this.model = model;
  }

//   // placePrepaidPickup
//   async create(req: Request, res: Response): Promise<void> {
//     const order = req.body;
//     let code = Code.FAIL;
//     let data = {};
//     try {
//       if (order) {
//         const r = await this.model.placePrepaidPickup(order);
//         if (r) {
//           code = Code.SUCCESS;
//           data = r;
//         }
//       }
//     } catch (error) {
//       logger.error(`create prepaid order error: ${error}`);
//     } finally {
//       res.setHeader("Content-Type", "application/json");
//       res.send(
//         JSON.stringify({
//           code: code,
//           data: data,
//         })
//       );
//     }
//   }

//   async removePickup(req: Request, res: Response) {
//     const orderId = req.params.id;
//     let code = Code.FAIL;
//     let data = {};
//     try {
//       const r = await this.model.doRemoveOne(orderId);
//       if (r) {
//         code = Code.SUCCESS;
//         data = r;
//       }
//     } catch (error) {
//       logger.error(`delete one order error: ${error}`);
//     } finally {
//       res.setHeader("Content-Type", "application/json");
//       res.send(
//         JSON.stringify({
//           code: code,
//           data: data,
//         })
//       );
//     }
//   }

//   async getBadPickup(req: Request, res: Response){
//     let rs: any[] = await this.model.getBadPickup();
//     res.setHeader('Content-Type', 'application/json');
//     res.send(rs);
//   }
}
