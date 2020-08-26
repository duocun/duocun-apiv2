
import { DB } from "../db";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";
import { Assignment, IAssignment } from "../models/assignment";
import { getLogger } from "../lib/logger";
import path from "path";
const logger = getLogger(path.basename(__filename));

export class AssignmentController {
  model: Assignment;
  constructor(db: DB) {
    // super(model, db);
    this.model = new Assignment(db);
  }

  async list(req: Request, res: Response): Promise<void> {
    const where: any = req.query.where;
    const deliverDate = where ? where.deliverDate : ''; // YYYY-MM-DD
    let code = Code.FAIL;
    let data: IAssignment[] = [];
    try {
      if (deliverDate) {
        const assignments: IAssignment[] = await this.model.list({deliverDate});
        code = Code.SUCCESS;
        data = assignments;
      }
    } catch (error) {
      logger.error(`get assignments error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }

  async assign(req: Request, res: Response): Promise<void> {
    const deliverDate = req.body.deliverDate; // YYYY-MM-DD
    const assignments = req.body.assignments;
    let code = Code.FAIL;
    let data = '';
    try {
      if (deliverDate && assignments && assignments.length>0) {
        await this.model.updateOrders(assignments);
        await this.model.updateAssignments(deliverDate, assignments);
        code = Code.SUCCESS;
        data = 'done';
      }
    } catch (error) {
      logger.error(`assgin order error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code,
        data,
      });
    }
  }
}