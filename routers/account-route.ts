import express from "express";
import { Request, Response } from "express";

import { DB } from "../db";
import { Account, AccountAttribute, IAccount } from "../models/account";
import { MerchantStuff } from "../merchant-stuff";
import { Utils } from "../utils";
import { Config } from "../config";
import { Model, Code } from "../models/model";
import { ObjectID } from "mongodb";

export function AccountRouter(db: DB) {
  const router = express.Router();
  const controller = new AccountController(db);
  
  // grocery api
  router.post('/login', (req, res) => { controller.login(req, res); });
  router.get('/current', (req, res) => { controller.getCurrentAccount(req, res); });
  router.get('/token/:id', (req, res) => { controller.gv1_getByTokenId(req, res); });
  router.get('/', (req, res) => { controller.gv1_list(req, res); });
  router.get('/:id', (req, res) => { controller.gv1_getById(req, res); });

  // v2 https://duocun.ca/api/Accounts/wechatLoginByOpenId
  router.post('/wechatLoginByOpenId', (req, res) => { controller.wechatLoginByOpenId(req, res); });
  router.get('/wechatLoginByCode', (req, res) => { controller.wechatLoginByCode(req, res); });
  router.get('/qFind', (req, res) => { controller.list(req, res); }); // deprecated
  router.get('/', (req, res) => { controller.list(req, res); });

  // v1
  // router.get('/attributes', (req, res) => { this.attrModel.quickFind(req, res); });

  // v1
  router.get('/wechatLogin', (req, res) => { controller.wechatLogin(req, res); });
  // router.post('/verifyCode', (req, res) => { controller.verifyCode(req, res); }); // deprecated
  router.get('/:id', (req, res) => { controller.get(req, res); }); // fix me


  // router.post('/', (req, res) => { controller.create(req, res); });
  // router.put('/', (req, res) => { controller.replace(req, res); });
  router.patch('/', (req, res) => { controller.update(req, res); });
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

export class AccountController extends Model {
  accountModel: Account;
  attrModel: AccountAttribute;
  merchantStuff: MerchantStuff;
  utils: Utils;
  cfg: Config;

  constructor(db: DB) {
    super(db, 'users');
    this.accountModel = new Account(db);
    this.attrModel = new AccountAttribute(db);
    this.merchantStuff = new MerchantStuff(db);
    this.utils = new Utils();
    this.cfg = new Config();
  }

  loginByPhone(req: Request, res: Response) {
    const phone = req.body.phone;
    const verificationCode = req.body.verificationCode;

    this.accountModel.doLoginByPhone(phone, verificationCode).then((tokenId: string) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(tokenId, null, 3));
    });
  }

  login(req: Request, res: Response) {
    const username = req.body.username;
    const password = req.body.password;

    this.accountModel.doLogin(username, password).then((tokenId: string) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(tokenId, null, 3));
    });
  }

  wechatLogin(req: Request, res: Response) {

    const authCode: any = req.query.code;
    res.setHeader('Content-Type', 'application/json');

    this.utils.getWechatAccessToken(authCode).then((r: any) => {
      this.utils.getWechatUserInfo(r.access_token, r.openid).then((x: any) => { // IAccount
        this.accountModel.doWechatSignup(x.openid, x.nickname, x.headimgurl, x.sex).then((account: IAccount) => {
          if (account) {
            const accountId = account._id.toString();
            const tokenId = this.accountModel.jwtSign(accountId);
            res.send(JSON.stringify(tokenId, null, 3));
          } else {
            res.send(JSON.stringify('', null, 3));
          }
        });
      }, err => {
        console.log(err);
        res.send(JSON.stringify('', null, 3));
      });
    }, err => {
      console.log(err);
      res.send(JSON.stringify('', null, 3));
    });
  }


  // return  {tokenId, accessToken, openId, expiresIn}
  wechatLoginByCode(req: Request, res: Response) {
    const wxLoginCode: any = req.query.code;
    res.setHeader('Content-Type', 'application/json');
    this.accountModel.wechatLoginByCode(wxLoginCode).then((r: any) => {
      if (r && r.tokenId) {
        res.send(JSON.stringify(r, null, 3));
      } else {
        res.send(JSON.stringify('', null, 3));
      }
    });
  }

  // return {tokenId}
  wechatLoginByOpenId(req: Request, res: Response) {
    const openId = req.body.openId;
    const accessToken = req.body.accessToken;

    res.setHeader('Content-Type', 'application/json');
    this.accountModel.wechatLoginByOpenId(accessToken, openId).then((tokenId: any) => {
      if (tokenId) {
        res.send(JSON.stringify({tokenId}, null, 3));
      } else {
        res.send(JSON.stringify('', null, 3));
      }
    });
  }


  // req --- require accountId, username and phone fields
  sendVerifyMsg(req: Request, res: Response) {
    const self = this;
    const lang = req.body.lang;
    const accountId = req.body.accountId;
    const phone = req.body.phone;

    this.accountModel.trySignupV2(accountId, phone).then((r: any) => {
      res.setHeader('Content-Type', 'application/json');
      if (r.phone) {
        const text = (lang === 'en' ? 'Duocun Verification Code: ' : '多村验证码: ') + r.verificationCode;
        this.accountModel.sendMessage(r.phone, text).then(() => {
          if (r.accountId) {
            const tokenId = this.accountModel.jwtSign(r.accountId);
            res.send(JSON.stringify(tokenId, null, 3));
          } else {
            res.send(JSON.stringify('', null, 3)); // sign up fail, please contact admin
          }
        });
      } else {
        res.send(JSON.stringify('', null, 3)); // sign up fail, please contact admin
      }
    });

  }

  verifyPhoneNumber(req: Request, res: Response) {
    const loggedInAccountId = req.body.accountId;
    const phone = req.body.phone;
    const code = req.body.code;

    this.accountModel.verifyPhoneNumber(phone, code, loggedInAccountId).then((r: any) => {
      this.accountModel.updateAccountVerified(r).then((ret) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(ret, null, 3));
      });
    });
  }

  sendClientMsg(req: Request, res: Response) {
    const self = this;
    const lang = req.body.lang;
    const phone = req.body.phone;
    const orderType = req.body.orderType;

    res.setHeader('Content-Type', 'application/json');

    let txt;
    if (orderType === 'G') {
      txt = lang === 'en' ? 'Reminder: Your delivery arrived.' : '多村提醒您: 货已送到, 请查收。(系统短信, 勿回)';
    } else {
      txt = lang === 'en' ? 'Reminder: Your delivery arrived.' : '多村提醒您: 餐已送到, 请查收。(系统短信, 勿回)';
    }

    self.accountModel.sendMessage(phone, txt).then(() => {
      res.send(JSON.stringify('', null, 3)); // sign up fail, please contact admin
    });
  }

  // v1 --- deprecated
  // verifyCode(req: Request, res: Response) {
  //   const phone = req.body.phone;
  //   let code = req.body.code;
  //   this.accountModel.doVerifyPhone(phone, code).then((verified) => {
  //     res.setHeader('Content-Type', 'application/json');
  //     res.send(JSON.stringify(verified, null, 3));
  //   });
  // }

  list(req: Request, res: Response) {
    let query = {};
    let fields: any[];
    const params = req.query;

    if (req.headers && req.headers.filter && typeof req.headers.filter === 'string') {
      query = (req.headers && req.headers.filter) ? JSON.parse(req.headers.filter) : null;
    }
    query = this.accountModel.convertIdFields(query);

    if (req.headers && req.headers.fields && typeof req.headers.fields === 'string') {
      fields = (req.headers && req.headers.fields) ? JSON.parse(req.headers.fields) : null;
    }

    if (params && params.keyword) {
      // query = { ...query, username: new RegExp(params.keyword) };
    }

    this.accountModel.find(query).then(accounts => {
      accounts.map((account: any) => {
        if (account && account.password) {
          delete account.password;
        }
      });
      const rs = this.accountModel.filterArray(accounts, fields);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(rs, null, 3));
    });
  }

  getCurrentAccount(req: Request, res: Response) {
    const tokenId: any = req.query.tokenId;

    let fields: string[];
    if (req.headers && req.headers.fields && typeof req.headers.fields === 'string') {
      fields = (req.headers && req.headers.fields) ? JSON.parse(req.headers.fields) : null;
    }

    this.accountModel.getAccountByToken(tokenId).then(account => {
      const r = this.accountModel.filter(account, fields);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(r, null, 3));
    });
  }

  signup(req: Request, res: Response) {
    const phone = req.body.phone.toString();
    const code: string = req.body.verificationCode.toString();

    this.accountModel.doSignup(phone, code).then((account: any) => {
      res.setHeader('Content-Type', 'application/json');
      const tokenId = this.accountModel.jwtSign(account._id.toString());
      res.send(JSON.stringify(tokenId, null, 3));
    });
  }


  // gv1

  // optional --- status
  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const query = status ? {status} : {};
    this.accountModel.find(query).then(accounts => {
      accounts.map((account: any) => {
        if (account && account.password) {
          delete account.password;
        }
      });
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: Code.SUCCESS,
        data: accounts 
      }));
    });
  }

  // id
  gv1_getById(req: Request, res: Response) {
    const id = req.params.id;
    this.accountModel.getById(id).then(account => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: account ? Code.SUCCESS : Code.FAIL,
        data: account
      }));
    });
  }

  // id
  gv1_getByTokenId(req: Request, res: Response) {
    const tokenId: any = req.params.id;
    this.accountModel.getAccountByToken(tokenId).then(account => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        code: account ? Code.SUCCESS : Code.FAIL,
        data: account
      }));
    });
  }
}
