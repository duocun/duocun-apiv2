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
    router.get('/sales', (req, res) => { controller.getSalesMap(req, res); });
   
    return router;
  };
  