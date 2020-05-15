import express from "express";
import { DB } from "../db";
import { Order, IOrder, OrderStatus } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";
import { Statistics } from "../models/statistics";
import { getLogger } from "../lib/logger";
import path from "path";
const logger = getLogger(path.basename(__filename));

export class StatisticsController extends Controller {
  model: Statistics;
  constructor(model: Statistics, db: DB) {
    super(model, db);
    this.model = model;
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any = {};
    let code = Code.FAIL;
    try {
      if (startDate && endDate) {
        const r = await this.model.getStatisticsInfo(startDate, endDate);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`get summary error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }

  async getMerchantStatistics(req: Request, res: Response): Promise<void> {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (startDate && endDate) {
        const r = await this.model.getMerchantInfo(startDate, endDate);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`get merchant statistic error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }
  async getDriverStatistics(req: Request, res: Response) {
    const deliverDate: any = req.query.deliverDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (deliverDate) {
        code = Code.SUCCESS;
        data = await this.model.getDriverStatistics(deliverDate);
      }
    } catch (error) {
      logger.error(`get driver statistic error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }
  async getProductStatistics(req: Request, res: Response) {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (startDate && endDate) {
        const r = await this.model.getProductInfo(startDate, endDate);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`get product statistic error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }

  async getSalesMap(req: Request, res: Response) {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any = {};
    let code = Code.FAIL;
    try {
      if (startDate) {
        const r = await this.model.getSalesMap(startDate, endDate);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`get sales statistic error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }
}
