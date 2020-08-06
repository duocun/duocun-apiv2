import { Request, Response } from "express";
import { DB } from "../db";
import { Account, AccountAttribute, IAccount } from "../models/account";
import { MerchantStuff } from "../merchant-stuff";
import { Utils } from "../utils";
import { Config } from "../config";
import { Controller, Code } from "./controller";
import path from "path";
import { getLogger } from "../lib/logger";
import { retrieve } from "../helpers/request-helper";
import { ObjectID } from "mongodb";

const logger = getLogger(path.basename(__filename));

export class AccountController extends Controller {
  model: Account;
  attrModel: AccountAttribute;
  merchantStuff: MerchantStuff;
  utils: Utils;
  cfg: Config;

  FIELDS_HIDE = {
    password: 0,
    openId: 0,
    cardAccountId: 0,
    cards: 0,
    verificationCode: 0,
  };

  constructor(model: Account, db: DB) {
    super(model, db);

    this.model = model;
    this.attrModel = new AccountAttribute(db);
    this.merchantStuff = new MerchantStuff(db);
    this.utils = new Utils();
    this.cfg = new Config();
  }

  async login(req: Request, res: Response): Promise<void> {
    const username: any = req.body.username;
    const password: any = req.body.password;
    let data: any = null;
    let code = Code.FAIL;
    try {
      const tokenId = await this.model.doLogin(username, password);
      if (tokenId) {
        code = Code.SUCCESS;
        data = tokenId;
      } else {
        code = Code.FAIL;
      }
    } catch (error) {
      logger.error(`list error: ${error}`);
    } finally {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: code,
          data: data,
        })
      );
    }
  }

  /**
   * list accounts (override controller's list to hide sensitive information)
   * @param req
   * @param res
   */
  async list(req: Request, res: Response): Promise<void> {
    // logger.debug("list override in account")
    let options: any = req.query.options || {};
    // remove sensitive field
    options.fields = this.FIELDS_HIDE;
    req.query.options = options;
    await super.list(req, res);
  }
  /**
   * get account (override controller's to hide sensitive information )
   * @param req
   * @param res
   */
  async get(req: Request, res: Response): Promise<void> {
    // logger.debug("list override in account")
    let options: any = (req.query && req.query.options) || {};
    // remove sensitive field
    options.fields = this.FIELDS_HIDE;
    req.query.options = options;
    await super.get(req, res);
  }

  
  //Keep Old API //////////////////////////////

  loginByPhone(req: Request, res: Response) {
    const phone = req.body.phone;
    const verificationCode = req.body.verificationCode;

    this.model
      .doLoginByPhone(phone, verificationCode)
      .then((tokenId: string) => {
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(tokenId, null, 3));
      });
  }

  wechatLogin(req: Request, res: Response) {
    const authCode: any = req.query.code;
    res.setHeader("Content-Type", "application/json");

    this.utils.getWechatAccessToken(authCode).then(
      (r: any) => {
        this.utils.getWechatUserInfo(r.access_token, r.openid).then(
          (x: any) => {
            // IAccount
            this.model
              .doWechatSignup(x.openid, x.nickname, x.headimgurl, x.sex)
              .then((account: IAccount) => {
                if (account) {
                  const accountId = account._id.toString();
                  const tokenId = this.model.jwtSign(accountId);
                  res.send(JSON.stringify(tokenId, null, 3));
                } else {
                  res.send(JSON.stringify("", null, 3));
                }
              });
          },
          (err) => {
            console.log(err);
            res.send(JSON.stringify("", null, 3));
          }
        );
      },
      (err) => {
        console.log(err);
        res.send(JSON.stringify("", null, 3));
      }
    );
  }

  // return  {tokenId, accessToken, openId, expiresIn}
  wechatLoginByCode(req: Request, res: Response) {
    const wxLoginCode: any = req.query.code;
    res.setHeader("Content-Type", "application/json");
    this.model.wechatLoginByCode(wxLoginCode).then((r: any) => {
      if (r && r.tokenId) {
        res.send(JSON.stringify(r, null, 3));
      } else {
        res.send(JSON.stringify("", null, 3));
      }
    });
  }

  // return {tokenId}
  wechatLoginByOpenId(req: Request, res: Response) {
    const openId = req.body.openId;
    const accessToken = req.body.accessToken;

    res.setHeader("Content-Type", "application/json");
    this.model.wechatLoginByOpenId(accessToken, openId).then((tokenId: any) => {
      if (tokenId) {
        res.send(JSON.stringify({ tokenId }, null, 3));
      } else {
        res.send(JSON.stringify("", null, 3));
      }
    });
  }

  // req --- require accountId, username and phone fields
  sendVerifyMsg(req: Request, res: Response) {
    const self = this;
    const lang = req.body.lang;
    const accountId = req.body.accountId;
    const phone = req.body.phone;

    this.model.trySignupV2(accountId, phone).then((r: any) => {
      res.setHeader("Content-Type", "application/json");
      if (r.phone) {
        const text =
          (lang === "en" ? "Duocun Verification Code: " : "多村验证码: ") +
          r.verificationCode;
        this.model.sendMessage(r.phone, text).then(() => {
          if (r.accountId) {
            const tokenId = this.model.jwtSign(r.accountId);
            res.send(JSON.stringify(tokenId, null, 3));
          } else {
            res.send(JSON.stringify("", null, 3)); // sign up fail, please contact admin
          }
        });
      } else {
        res.send(JSON.stringify("", null, 3)); // sign up fail, please contact admin
      }
    });
  }

  verifyPhoneNumber(req: Request, res: Response) {
    const loggedInAccountId = req.body.accountId;
    const phone = req.body.phone;
    const code = req.body.code;

    this.model
      .verifyPhoneNumber(phone, code, loggedInAccountId)
      .then((r: any) => {
        this.model.updateAccountVerified(r).then((ret) => {
          res.setHeader("Content-Type", "application/json");
          res.send(JSON.stringify(ret, null, 3));
        });
      });
  }

  sendClientMsg(req: Request, res: Response) {
    const self = this;
    const lang = req.body.lang;
    const phone = req.body.phone;
    const orderType = req.body.orderType;

    res.setHeader("Content-Type", "application/json");

    let txt;
    if (orderType === "G") {
      txt =
        lang === "en"
          ? "Reminder: Your delivery arrived."
          : "多村提醒您: 货已送到, 请查收。(系统短信, 勿回)";
    } else {
      txt =
        lang === "en"
          ? "Reminder: Your delivery arrived."
          : "多村提醒您: 餐已送到, 请查收。(系统短信, 勿回)";
    }

    self.model.sendMessage(phone, txt).then(() => {
      res.send(JSON.stringify("", null, 3)); // sign up fail, please contact admin
    });
  }

  // v1 --- deprecated
  // verifyCode(req: Request, res: Response) {
  //   const phone = req.body.phone;
  //   let code = req.body.code;
  //   this.model.doVerifyPhone(phone, code).then((verified) => {
  //     res.setHeader('Content-Type', 'application/json');
  //     res.send(JSON.stringify(verified, null, 3));
  //   });
  // }

  async getCurrentAccount(req: Request, res: Response) {
    const tokenId: any = req.query.tokenId;
    const account = await this.model.getAccountByToken(tokenId);
    if (account) {
      res.json({
        code: Code.SUCCESS,
        data: account,
      });
    } else {
      res.json({
        code: Code.FAIL,
      });
    }
  }

  signup(req: Request, res: Response) {
    const phone = req.body.phone.toString();
    const code: string = req.body.verificationCode.toString();

    this.model.doSignup(phone, code).then((account: any) => {
      res.setHeader("Content-Type", "application/json");
      const tokenId = this.model.jwtSign(account._id.toString());
      res.send(JSON.stringify(tokenId, null, 3));
    });
  }

  // gv1

  // optional --- status
  gv1_list(req: Request, res: Response) {
    const status = req.query.status;
    const query = status ? { status } : {};
    this.model.find(query).then((accounts) => {
      accounts.map((account: any) => {
        if (account && account.password) {
          delete account.password;
        }
      });
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: Code.SUCCESS,
          data: accounts,
        })
      );
    });
  }

  // id
  getByTokenId(req: Request, res: Response) {
    const tokenId: any = req.params.id;
    this.model.getAccountByToken(tokenId).then((account) => {
      res.setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          code: account ? Code.SUCCESS : Code.FAIL,
          data: account,
        })
      );
    });
  }
}
