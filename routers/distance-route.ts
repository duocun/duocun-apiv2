import express from "express";
import { Distance } from "../models/distance";
import { DB } from "../db";

export function DistanceRouter(db: DB){
  const router = express.Router();
  const controller = new Distance(db);

  router.get('/qFind', (req, res) => { controller.quickFind(req, res); });
  router.get('/', (req, res) => { controller.list(req, res); });
  router.get('/:id', (req, res) => { controller.get(req, res); });
  router.post('/Road', (req, res) => { controller.reqRoadDistances(req, res); });
  router.post('/', (req, res) => { controller.create(req, res); });
  router.put('/', (req, res) => { controller.replace(req, res); });
  router.patch('/', (req, res) => { controller.update(req, res); });
  router.delete('/', (req, res) => { controller.remove(req, res); });

  return router;
};
