import express, {Request, Response} from "express";
import { DB } from "../db";
import { parseQuery } from "../middlewares/parseQuery";
import { StatisticsController } from "../controllers/statistics-controller";
import { Statistics } from "../models/statistics";

export function StatisticsRouter(db: DB) {
    const router = express.Router();
    const model = new Statistics(db);
    const controller = new StatisticsController(model, db);

    router.get('/summary', (req, res) => { controller.getStatistics(req, res); });
    router.get('/driver', (req, res) => { controller.getDriverStatistics(req, res); });
    router.get('/merchant', (req, res) => { controller.getMerchantStatistics(req, res); });
    router.get('/product', (req, res) => { controller.getProductStatistics(req, res); });
    router.get('/salary', (req, res) => { controller.getSalaryStatistics(req, res); });
    router.get('/sales', (req, res) => { controller.getSalesMap(req, res); });
   
    router.get('/order-analytics', (req, res) => { controller.getOrderAnalytics(req, res); });
    router.get('/product-analytics', (req, res) => { controller.getProductAnalytics(req, res); });
    router.get('/deliver-cost-analytics', [parseQuery], (req: Request, res: Response) => { controller.getDeliverCostAnalytics(req, res); });
    
    return router;
  };
  