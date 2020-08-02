import express, {Request, Response} from "express";
import { Pickup } from "../models/pickup";
import { PickupController } from "../controllers/pickup-controller";
import { DB } from "../db";
import { parseQuery } from "../middlewares/parseQuery";

export function PickupRouter(db: DB){
  const router = express.Router();
  const model = new Pickup(db);
  const controller = new PickupController(model, db);

  router.get('/', [parseQuery], (req: Request, res: Response) => { controller.list(req, res); });
  // router.get('/:id', (req, res) => { controller.get(req, res); });
  // router.post('/', (req, res) => { controller.create(req, res); });
  router.put('/:id', (req, res) => { controller.updateOne(req, res); });

  return router;
};