import express, {Request, Response} from "express";
import { DB } from "../db";
import { Order } from "../models/order";
import { parseQuery } from "../middlewares/parseQuery";
import { StatisticsController } from "../controllers/statistics-controller";

export function StatisticsRouter(db: DB) {
    const router = express.Router();
    const model = new Order(db);
    const controller = new StatisticsController(model, db);

    router.get('/stat', (req, res) => { controller.getStatistics(req, res); });
    router.get('/driver', (req, res) => { controller.getDriverStatistics(req, res); });
    router.get('/merchant', (req, res) => { controller.getMerchantStatistics(req, res); });
    router.get('/product', (req, res) => { controller.getProductStatistics(req, res); });
  
   
    return router;
  };
  