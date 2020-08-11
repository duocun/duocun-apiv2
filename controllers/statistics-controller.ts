import express from "express";
import { DB } from "../db";
import { Order, IOrder, OrderStatus } from "../models/order";
import { Request, Response } from "express";
import { Controller, Code } from "./controller";
import { Statistics } from "../models/statistics";
import { getLogger } from "../lib/logger";
import path from "path";
import { hasRole } from "../lib/rbac";
import { ROLE, RESOURCES, PERMISSIONS } from "../models/role";
const logger = getLogger(path.basename(__filename));

export class StatisticsController extends Controller {
  model: Statistics;
  constructor(model: Statistics, db: DB) {
    super(model, db);
    this.model = model;
  }

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getProductStatistics(req: Request, res: Response) {
    const deliverDate: any = req.query.deliverDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (deliverDate) {
        const r = await this.model.getProductInfo(deliverDate);
        code = Code.SUCCESS;
        data = r;
      }
    } catch (error) {
      logger.error(`get product statistic error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send({
        code: code,
        data: data,
      });
    }
  }

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getSalaryStatistics(req: Request, res: Response) {
    let data: any = "";
    let code = Code.FAIL;
    try {
      code = Code.SUCCESS;
      data = await this.model.getSalaryStatistics();
    } catch (error) {
      logger.error(`get salary statistic error: ${error}`);
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getSalesMap(req: Request, res: Response) {
    const deliverDate: any = req.query.deliverDate;
    const orderDate: any = req.query.orderDate;
    let data: any = {};
    let code = Code.FAIL;
    try {
      if (deliverDate) {
        const r = await this.model.getSalesMap(deliverDate, "Delivery Date");
        code = Code.SUCCESS;
        data = r;
      } else if (orderDate) {
        const r = await this.model.getSalesMap(orderDate, "Order Date");
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getOrderAnalytics(req: Request, res: Response) {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (startDate) {
        code = Code.SUCCESS;
        data = await this.model.getOrderAnalytics(startDate, endDate);
      }
    } catch (error) {
      logger.error(`get order statistic error: ${error}`);
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getProductAnalytics(req: Request, res: Response) {
    const startDate: any = req.query.startDate;
    const endDate: any = req.query.endDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (startDate) {
        code = Code.SUCCESS;
        data = await this.model.getProductAnalytics(startDate, endDate);
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

  @hasRole({ resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ })
  async getDeliverCostAnalytics(req: Request, res: Response) {
    const where: any = req.query.where;
    const startDate: any = where.startDate;
    const endDate: any = where.endDate;
    let data: any[] = [];
    let code = Code.FAIL;
    try {
      if (startDate) {
        code = Code.SUCCESS;
        data = await this.model.getDeliverCostAnalytics(startDate, endDate);
      }
    } catch (error) {
      logger.error(`get order statistic error: ${error}`);
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
