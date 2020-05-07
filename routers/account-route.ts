import express, {Request, Response} from "express";

import { DB } from "../db";
import { Account } from "../models/account";
import {AccountController} from "../controllers/account-controller";
import { parseQuery } from "../middlewares/parseQuery";

export function AccountRouter(db: DB) {
  const router = express.Router();
  const model = new Account(db);
  const controller = new AccountController(model, db);
  
  // admin api
  router.get('/current', (req, res) => { controller.getCurrentAccount(req, res); }); // non standard rsp
  router.get('/token/:id', (req, res) => { controller.getByTokenId(req, res); });
  
  router.post('/login', (req: Request, res: Response) => { controller.login(req, res); });
  router.get('/',  [parseQuery], async (req: Request, res: Response) =>  { await controller.list(req, res); });
  router.get('/:id', async (req: Request, res: Response) => { await controller.get(req, res); });
  router.post('/', async (req: Request, res: Response) => { await controller.create(req, res); });

  // v2 https://duocun.ca/api/Accounts/wechatLoginByOpenId
  router.post('/wechatLoginByOpenId', (req, res) => { controller.wechatLoginByOpenId(req, res); });
  router.get('/wechatLoginByCode', (req, res) => { controller.wechatLoginByCode(req, res); });
  router.get('/qFind', (req, res) => { controller.list(req, res); }); // deprecated

  // v1
  // router.get('/attributes', (req, res) => { this.attrModel.quickFind(req, res); });

  // v1
  router.get('/wechatLogin', (req, res) => { controller.wechatLogin(req, res); });
  // router.post('/verifyCode', (req, res) => { controller.verifyCode(req, res); }); // deprecated
  router.get('/:id', (req, res) => { controller.get(req, res); }); // fix me


  // router.post('/', (req, res) => { controller.create(req, res); });
  // router.put('/', (req, res) => { controller.replace(req, res); });
  router.patch('/', (req, res) => { model.update(req, res); });
  // router.delete('/', (req, res) => { controller.remove(req, res); });

  // router.post('/sendClientMsg2', (req, res) => { controller.sendClientMsg2(req, res); });
  router.post('/sendClientMsg', (req, res) => { controller.sendClientMsg(req, res); });
  router.post('/verifyPhoneNumber', (req, res) => { controller.verifyPhoneNumber(req, res); });
  router.post('/sendVerifyMsg', (req, res) => { controller.sendVerifyMsg(req, res); });
  router.post('/applyMerchant', (req, res) => { controller.merchantStuff.applyMerchant(req, res); });
  router.post('/getMerchantApplication', (req, res) => { controller.merchantStuff.getApplication(req, res); });

  router.post('/loginByPhone', (req, res) => { controller.loginByPhone(req, res); });
  router.route('/signup').post((req, res) => { controller.signup(req, res); });


  return router;
};
