import express, {Request, Response} from "express";
import { DB } from "../db";
import { ChatMessage } from "../models/messages";
import { parseQuery } from "../middlewares/parseQuery";

export function MessageRouter(db: DB){
  const router = express.Router();
  const controller = new ChatMessage(db);
  // customer service
  router.get('/chatusers', [parseQuery], async (req: Request, res: Response) =>  { await controller.getUsers(req, res) });
  router.get('/chatmessages/:managerId/:userId', [parseQuery], async (req: Request, res: Response) =>  { await controller.getChatMessages(req, res) });
  router.get('/reset/:messageId', (req, res) => { controller.resetMessage(req, res); });

  return router;
};

