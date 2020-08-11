import express, { Request, Response, Router } from "express";
import path from "path";
import { DB } from "../db";
import { Role } from "../models/role";
import { getLogger } from "../lib/logger";
import { RoleController } from "../controllers/role-controller";

const logger = getLogger(path.basename(__filename));

export const RoleRouter = (db: DB) => {
  const router = express.Router();
  const model = new Role(db);
  const controller = new RoleController(model, db);

  router.get("/", async (req, res) => {
    await controller.show(req, res);
  });
  router.post("/", async (req, res) => {
    await controller.save(req, res);
  });

  return router;
};
