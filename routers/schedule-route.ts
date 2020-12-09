import express, { Request, Response } from "express";
import path from "path";
import { DB } from "../db";
import { Schedule } from "../models/schedule";
import { ScheduleController } from "../controllers/schedule-controller";
import { parseQuery } from "../middlewares/parseQuery";

export const ScheduleRouter = (db: DB) => {
  const router = express.Router();
  const model = new Schedule(db);
  const controller = new ScheduleController(model, db);


  router.get("/:id", async (req, res) => {
    await controller.show(req, res);
  });

  router.post("/:id", async (req, res) => {
    await controller.save(req, res);
  });

  router.delete("/:id", async (req, res) => {
    await controller.delete(req, res);
  });

  router.get("/", [parseQuery], async (req: Request, res: Response) => {
    await controller.list(req, res);
  });

  return router;
};
