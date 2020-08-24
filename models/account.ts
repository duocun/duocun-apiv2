import { ObjectId } from "mongodb";
import { DB } from "../db";
import { Model } from "./model";
import { ROLE } from "./role";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cfg, { Config } from "../config";
import { Utils } from "../utils";
import moment from "moment";
import { EventLog } from "./event-log";
import path from "path";
import { getLogger } from "../lib/logger";
import _ from "lodash";

import { Log, AppId } from "./log"; // database logger

const logger = getLogger(path.basename(__filename));

const saltRounds = 10;

export const DEBUG_ACCOUNT_ID = "5e9517761b9d9e01d8b44275";

export const VerificationError = {
  NONE: "N",
  WRONG_CODE: "WC",
  PHONE_NUMBER_OCCUPIED: "PO",
  REQUIRE_SIGNUP: "RS",
  NO_PHONE_NUMBER_BIND: "NP",
};

export const AccountType = {
  TEMP: "tmp",
};

export interface IAccountAttribute {
  _id?: string;
  code: string; //   I: INDOOR, G: GARDENING, R: ROOFING, O: OFFICE, P: PLAZA, H: HOUSE, C: CONDO
  name: string;
  nameEN?: string;
}

export interface IAccount {
  _id: string;
  type: string; // wechat, google, fb
  realm?: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  id?: string;
  password?: string;

  openId?: string; // wechat info
  sex?: number; // wechat info
  imageurl?: string; // wechat imageurl
  unionid?: string; // wechat unionid
  accessTokens?: any[];
  // address?: IAddress;
  roles?: ROLE[]; // 'super', 'merchant-admin', 'merchant-stuff', 'driver', 'user'
  visited?: boolean;
  stripeCustomerId?: string;
  pickup: string;
  balance: number;
  verificationCode: string;
  verified: boolean;

  attributes?: string[]; // IAccountAttribute's code, I: INDOOR, G: GARDENING, R: ROOFING, O: OFFICE, P: PLAZA, H: HOUSE, C: CONDO
  info?: string; // client info

  merchants?: string[]; // only merchant account have this field
}

export class AccountAttribute extends Model {
  constructor(dbo: DB) {
    super(dbo, "user_attributes");
  }
}

export class Account extends Model {
  cfg: Config;
  twilioClient: any;
  eventLogModel: EventLog;
  utils: Utils;

  constructor(dbo: DB) {
    super(dbo, "users");
    this.eventLogModel = new EventLog(dbo);
    this.cfg = cfg;
    this.twilioClient = require("twilio")(
      this.cfg.TWILIO.SID,
      this.cfg.TWILIO.TOKEN
    );
    this.utils = new Utils();
  }

  comparePassword(password: string, encrypted: string) {
    return new Promise((resolve) => {
      bcrypt.compare(password, encrypted, (err, matched) => {
        logger.error(`login error: ${err}`);
        resolve(matched);
      });
    });
  }

  // --------------------------------------------------------------------------------------------------
  // wechat, google or facebook can not use this request to login
  // username --- optional, can be null, unique  username
  // password --- mandadory field
  async loginByUsername(username: string, password: string) {
    if (username) {
      const account: IAccount = await this.findOne({ username });
      if (account && account.password) {
        try {
          const matched = await this.comparePassword(
            password,
            account.password
          );
          if (matched) {
            account.password = "";
            const token = jwt.sign(account._id.toString(), cfg.JWT.SECRET); // SHA256
            return {data: account, token };
          } else {
            const message = 'username and password does not match';
            return {data:'', token: '', message};
          }
        } catch (e) {
          const message = `login sign token exception ${e}`;
          Log.save({appId: AppId.API_V2, msg: message}).then(() => { });
          return {data:'', token: '', message};
        }
      } else {
        const message = `login error: cannot find the user: ${username}`;
        Log.save({appId: AppId.API_V2, msg: message}).then(() => { });
        return {data:'', token: '', message};
      }
    } else {
      const message = `login error: username is empty`
      Log.save({appId: AppId.API_V2, msg: message}).then(() => { });
      return {data:'', token: '', message};
    }
  }

  async loginByEmail(email: string, password: string) {
    const account: IAccount = await this.findOne({
      email,
      type: { $ne: "tmp" },
    });
    if (!account) {
      return {
        data: null,
        message: "No such account",
      };
    }
    if (!account.password) {
      return {
        data: null,
        message: "Password is empty",
      };
    }
    const matched = await this.comparePassword(password, account.password);
    if (matched) {
      return {
        data: account,
        token: this.jwtSign(String(account._id)),
      };
    } else {
      return {
        data: null,
        message: "Password mismatch",
      };
    }
  }

  jwtSign(accountId: string) {
    return jwt.sign(accountId, this.cfg.JWT.SECRET); // SHA256
  }

  // return message
  async sendMessage(phone: string, text: string) {
    return await this.twilioClient.messages.create({
      body: text,
      from: "+16475591743",
      to: "+1".concat(phone),
    });
  }

  getRandomCode() {
    const d1 = Math.floor(Math.random() * 10).toString();
    const d2 = Math.floor(Math.random() * 10).toString();
    const d3 = Math.floor(Math.random() * 10).toString();
    const d4 = Math.floor(Math.random() * 10).toString();
    return (d1 + d2 + d3 + d4).toString();
  }

  async trySignupV2(accountId: string, rawPhone: any) {
    if (!accountId && !rawPhone) {
      // doesn't have phone and account
      return {
        accountId: "",
        phone: "",
        verificationCode: "",
        verified: false,
      };
    } else if (!rawPhone && accountId) {
      // has account
      const x = await this.findOne({ _id: accountId });
      if (x && x.phone) {
        const code = this.getRandomCode();
        return {
          accountId,
          phone: x.phone,
          verificationCode: code,
          verified: false,
        };
      } else {
        return { accountId, phone: "", verificationCode: "", verified: false };
      }
    } else if (rawPhone && !accountId) {
      // has phone and no account
      const code = this.getRandomCode();
      let phone =
        rawPhone.substring(0, 2) === "+1" ? rawPhone.substring(2) : rawPhone;
      phone = phone.match(/\d+/g).join("");
      const data = {
        username: phone,
        type: "client", // tmp user are those verified phone but did not signup under agreement
        balance: 0,
        phone,
        verificationCode: code,
        verified: false,
        attributes: [],
        created: moment().toISOString(),
      };
      await this.insertOne(data);
      const x = await this.findOne({ phone });
      return {
        accountId: x._id.toString(),
        phone: phone,
        verificationCode: code,
        verified: false,
      };
    } else {
      // has both phone and account
      const code = this.getRandomCode();
      let phone =
        rawPhone.substring(0, 2) === "+1" ? rawPhone.substring(2) : rawPhone;
      phone = phone.match(/\d+/g).join("");
      const occupiedAccount = await this.findOne({ phone });
      if (occupiedAccount) {
        const data = { phone, verificationCode: code };
        await this.updateOne({ _id: occupiedAccount._id.toString() }, data); // replace with new phone number & code
        return {
          accountId: occupiedAccount._id.toString(),
          phone,
          verificationCode: code,
          verified: false,
        };
      } else {
        // use existing account
        const account = await this.findOne({ _id: accountId });
        return {
          accountId: account._id.toString(),
          phone: phone,
          verificationCode: code,
          verified: false,
        };
      }
    }
  }

  // try signup an account with phone number.
  // If this phone number is already used by an account, return that account.
  // Otherwise:
  // If user already login, and the phone number did not use, associate the phone number.
  // If use did not login, create a new account with this phone number.
  //    --- if ok {accountId:x, phone: phone}, else {accountId:'', phone}
  trySignup(accountId: string, rawPhone: any): Promise<any> {
    const d1 = Math.floor(Math.random() * 10).toString();
    const d2 = Math.floor(Math.random() * 10).toString();
    const d3 = Math.floor(Math.random() * 10).toString();
    const d4 = Math.floor(Math.random() * 10).toString();
    const code: string = (d1 + d2 + d3 + d4).toString();

    let phone =
      rawPhone.substring(0, 2) === "+1" ? rawPhone.substring(2) : rawPhone;
    phone = phone.match(/\d+/g).join("");

    return new Promise((resolve, reject) => {
      this.findOne({ phone: phone }).then((account: IAccount) => {
        if (account) {
          // phone number unchange, verification code could change
          const data = { phone: phone, verificationCode: code };
          this.updateOne({ _id: account._id.toString() }, data).then((r) => {
            if (r.ok === 1) {
              resolve({
                accountId: account._id.toString(),
                phone: phone,
                verificationCode: code,
              });
            } else {
              resolve({ accountId: "", phone: phone, verificationCode: code }); // update fail, should not happen
            }
          });
        } else {
          if (accountId) {
            // account exist, change account phone number
            const data = {
              phone: phone,
              verificationCode: code,
              verified: false,
            };
            this.updateOne({ _id: accountId }, data).then((r) => {
              if (r.ok === 1) {
                resolve({
                  accountId: accountId,
                  phone: phone,
                  verificationCode: code,
                });
              } else {
                resolve({
                  accountId: "",
                  phone: phone,
                  verificationCode: code,
                }); // update fail, should not happen
              }
            });
          } else {
            // account and phone number do not exist, create temp account
            // bcrypt.hash(password, saltRounds, (err, hash) => {
            //   data['password'] = hash;
            const data = {
              username: phone,
              phone: phone,
              type: "tmp", // tmp user are those verified phone but did not signup under agreement
              balance: 0,
              verificationCode: code,
              verified: false,
              attributes: [],
              created: moment().toISOString(),
            };
            this.insertOne(data).then((x: IAccount) => {
              resolve({
                accountId: x._id.toString(),
                phone: phone,
                verificationCode: code,
              });
            });
          }
        }
      });
    });
  }

  async updateAccountVerified(result: any) {
    const verified = result.verified;
    if (verified) {
      const account = result.account;
      const accountId = account._id.toString();
      await this.updateOne({ _id: accountId }, { verified });
      const tokenId = jwt.sign(accountId, cfg.JWT.SECRET); // SHA256
      return { ...result, tokenId: tokenId };
    } else {
      return { ...result, tokenId: null };
    }
  }

  verifyPhoneNumber(phone: string, code: string, loggedInAccountId: string) {
    return new Promise((resolve, reject) => {
      this.findOne({ phone }).then((account) => {
        if (account && account.password) {
          delete account.password;
        }
        if (loggedInAccountId) {
          if (account) {
            // phone has account
            if (account._id.toString() !== loggedInAccountId) {
              resolve({
                verified: false,
                err: VerificationError.PHONE_NUMBER_OCCUPIED,
                account,
              });
            } else {
              if (
                account.verificationCode &&
                code === account.verificationCode
              ) {
                const tokenId = jwt.sign(
                  account._id.toString(),
                  cfg.JWT.SECRET
                ); // SHA256
                resolve({
                  verified: true,
                  err: VerificationError.NONE,
                  account,
                  tokenId,
                });
              } else {
                resolve({
                  verified: false,
                  err: VerificationError.WRONG_CODE,
                  account,
                });
              }
            }
          } else {
            const tokenId = jwt.sign(loggedInAccountId, cfg.JWT.SECRET); // SHA256
            resolve({
              verified: true,
              err: VerificationError.NONE,
              account,
              tokenId,
            }); // please resend code
          }
        } else {
          // enter from web page
          if (account) {
            if (account.openId) {
              resolve({
                verified: false,
                err: VerificationError.PHONE_NUMBER_OCCUPIED,
                account,
              });
            } else {
              if (
                account.verificationCode &&
                code === account.verificationCode
              ) {
                const tokenId = jwt.sign(
                  account._id.toString(),
                  cfg.JWT.SECRET
                ); // SHA256
                resolve({
                  verified: true,
                  err: VerificationError.NONE,
                  account,
                  tokenId,
                }); // tokenId: tokenId,
              } else {
                resolve({
                  verified: false,
                  err: VerificationError.WRONG_CODE,
                  account,
                });
              }
            }
          } else {
            resolve({
              verified: false,
              err: VerificationError.NO_PHONE_NUMBER_BIND,
              account,
            }); // // please resend code
          }
        }
      });
    });
  }

  doVerifyAndLogin(phone: string, code: string, loggedInAccountId: string) {
    return new Promise((resolve, reject) => {
      if (loggedInAccountId) {
        // logged in
        this.findOne({ phone }).then((account: IAccount) => {
          if (account) {
            // phone has an account
            if (account._id.toString() !== loggedInAccountId) {
              resolve({
                verified: false,
                err: VerificationError.PHONE_NUMBER_OCCUPIED,
              });
            } else {
              if (
                account.verificationCode &&
                code === account.verificationCode
              ) {
                if (account.password) {
                  delete account.password;
                }
                account.verified = true;
                this.updateOne({ _id: account._id }, { verified: true }).then(
                  () => {
                    if (account.type === AccountType.TEMP) {
                      resolve({
                        verified: true,
                        err: VerificationError.REQUIRE_SIGNUP,
                        account: account,
                      });
                    } else {
                      resolve({
                        verified: true,
                        err: VerificationError.NONE,
                        account: account,
                      });
                    }
                  }
                );
              } else {
                resolve({ verified: false, err: VerificationError.WRONG_CODE });
              }
            }
          } else {
            // resolve({ verified: false, err: VerificationError.NO_PHONE_NUMBER_BIND });
            resolve({
              verified: true,
              err: VerificationError.NONE,
              account: account,
            });
          }
        });
      } else {
        // loggedInAccountId = ''
        this.findOne({ phone: phone }).then((account) => {
          if (account) {
            if (account.type === AccountType.TEMP) {
              if (
                account.verificationCode &&
                code === account.verificationCode
              ) {
                if (account.password) {
                  delete account.password;
                }
                account.verified = true;
                this.updateOne({ _id: account._id }, { verified: true }).then(
                  () => {
                    resolve({
                      verified: true,
                      err: VerificationError.REQUIRE_SIGNUP,
                      account: account,
                    });
                  }
                );
              } else {
                resolve({ verified: false, err: VerificationError.WRONG_CODE });
              }
            } else {
              if (account.openId) {
                resolve({
                  verified: false,
                  err: VerificationError.PHONE_NUMBER_OCCUPIED,
                });
              } else {
                if (
                  account.verificationCode &&
                  code === account.verificationCode
                ) {
                  const tokenId = jwt.sign(
                    account._id.toString(),
                    cfg.JWT.SECRET
                  ); // SHA256
                  if (account.password) {
                    delete account.password;
                  }
                  account.verified = true;
                  this.updateOne({ _id: account._id }, { verified: true }).then(
                    () => {
                      resolve({
                        verified: true,
                        err: VerificationError.NONE,
                        tokenId: tokenId,
                        account: account,
                      });
                    }
                  );
                } else {
                  resolve({
                    verified: false,
                    err: VerificationError.WRONG_CODE,
                  });
                }
              }
            }
          } else {
            resolve({
              verified: false,
              err: VerificationError.NO_PHONE_NUMBER_BIND,
            });
          }
        });
      }
    });
  }

  getAccountByToken(tokenId: string): Promise<IAccount> {
    return new Promise((resolve, reject) => {
      if (tokenId && tokenId !== "undefined" && tokenId !== "null") {
        try {
          const _id = jwt.verify(tokenId, cfg.JWT.SECRET);
          if (_id) {
            this.findOne({ _id }).then((account: IAccount) => {
              if (account) {
                delete account.password;
              }
              resolve(account);
            });
          } else {
            resolve();
          }
        } catch (e) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  createTmpAccount(phone: string, verificationCode: string): Promise<IAccount> {
    return new Promise((resolve, reject) => {});
  }

  // There are two senarios for signup.
  // 1. after user verified phone number, there is a button for signup. For this senario, phone number and verification code are mandatory
  // 2. when user login from 3rd party, eg. from wechat, it will do signup. For this senario, wechat openid is mandaroty.
  // only allow to signup with phone number and verification code (password)
  doSignup(phone: string, verificationCode: string): Promise<IAccount> {
    return new Promise((resolve, reject) => {
      if (phone) {
        this.findOne({ phone: phone }).then((x: IAccount) => {
          if (x) {
            const updates = {
              phone: phone,
              verificationCode: verificationCode,
              type: "client",
            };
            this.updateOne({ _id: x._id.toString() }, updates).then(() => {
              if (x && x.password) {
                delete x.password;
              }
              x = { ...x, ...updates };
              resolve(x);
            });
          } else {
            // should not go here
            const data = {
              username: phone,
              phone: phone,
              type: AccountType.TEMP, // tmp user are those verified phone but did not signup under agreement
              balance: 0,
              verificationCode: verificationCode,
              verified: false,
              attributes: [],
              created: moment().toISOString(),
            };
            this.insertOne(data).then((x: IAccount) => {
              resolve(x);
            });
          }
        });
      } else {
        resolve();
      }
    });
  }

  // When user login from 3rd party, eg. from wechat, it will do signup. For this senario, wechat openid is mandaroty.
  doWechatSignup(
    openId: string,
    username: string,
    imageurl: string,
    sex: number
  ): Promise<IAccount> {
    return new Promise((resolve, reject) => {
      if (openId) {
        this.findOne({ openId: openId }).then((x: IAccount) => {
          if (x) {
            const updates = {
              username: username,
              imageurl: imageurl,
              sex: sex,
            };
            this.updateOne({ _id: x._id.toString() }, updates).then(() => {
              delete x.password;
              x = { ...x, ...updates };
              resolve(x);
            });
          } else {
            // no account find
            const data = {
              username: username,
              imageurl: imageurl,
              sex: sex,
              type: "user",
              realm: "wechat",
              openId: openId,
              // unionId: x.unionid, // not be able to get wechat unionId
              balance: 0,
              attributes: [],
              created: moment().toISOString(),
            };
            this.insertOne(data).then((x: IAccount) => {
              delete x.password;
              resolve(x);
            });
          }
        });
      } else {
        resolve();
      }
    });
  }

  // --------------------------------------------------------------------------------------------------
  // wechat, google or facebook can not use this request to login
  // phone    ---  unique phone number, verification code as password by default
  doLoginByPhone(phone: string, verificationCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.findOne({ phone: phone }).then((r: IAccount) => {
        if (r) {
          if (r.verificationCode) {
            if (r.verificationCode === verificationCode) {
              const tokenId = jwt.sign(r._id.toString(), cfg.JWT.SECRET); // SHA256
              if (r.password) {
                delete r.password;
              }
              resolve(tokenId);
              // resolve({tokenId: tokenId, account: r});
            } else {
              resolve();
              // resolve({tokenId: '', account: null});
            }
          } else {
            resolve();
            // resolve({tokenId: '', account: null});
          }
        } else {
          resolve();
          // resolve({tokenId: '', account: null});
        }
      });
    });
  }

  // return tokenId
  async wechatLoginByOpenId(accessToken: string, openId: string) {
    try {
      const x = await this.utils.getWechatUserInfo(accessToken, openId);
      if (x && x.openid) {
        const account = await this.doWechatSignup(
          x.openid,
          x.nickname,
          x.headimgurl,
          x.sex
        );
        if (account) {
          const accountId = account._id.toString();
          const tokenId = jwt.sign(accountId, this.cfg.JWT.SECRET); // SHA256
          return tokenId;
        } else {
          await this.eventLogModel.addLogToDB(
            DEBUG_ACCOUNT_ID,
            "signup by wechat",
            "",
            "signup by wechat fail"
          );
          return null;
        }
      } else {
        await this.eventLogModel.addLogToDB(
          DEBUG_ACCOUNT_ID,
          "login by openid",
          "",
          "wechat get user info fail"
        );
        return null;
      }
    } catch (err) {
      const message =
        "accessToken:" +
        accessToken +
        ", openId:" +
        openId +
        ", msg:" +
        err.toString();
      await this.eventLogModel.addLogToDB(
        DEBUG_ACCOUNT_ID,
        "login by openid",
        "",
        message
      );
      return null;
    }
  }

  // code [string] --- wechat authentication code
  // return {tokenId, accessToken, openId, expiresIn}
  async wechatLoginByCode(code: string) {
    try {
      const r = await this.utils.getWechatAccessToken(code); // error code 40163
      if (r && r.access_token && r.openid) {
        // wechat token
        const accessToken = r.access_token;
        const openId = r.openid;
        const expiresIn = r.expires_in; // 2h
        const refreshToken = r.refresh_token;
        const tokenId = await this.wechatLoginByOpenId(accessToken, openId);
        return { tokenId, accessToken, openId, expiresIn };
      } else {
        const message =
          "code:" + code + ", errCode:" + r.code + ", errMsg:" + r.msg;
        await this.eventLogModel.addLogToDB(
          DEBUG_ACCOUNT_ID,
          "login by code",
          "",
          message
        );
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  async validate(doc: any, scope: "create" | "update" | "profile"): Promise<any> {
    if (scope === "profile") {
      doc = _.pick(doc, [
        "username",
        "email",
        "passwordRaw",
        "phone"
      ])
    } else {
      doc = _.pick(doc, [
        "_id",
        "username",
        "email",
        "passwordRaw",
        "imageurl",
        "realm",
        "balance",
        "sex",
        "openId",
        "roles",
        "sex",
        "attributes",
        "phone",
        "verified",
        "secondPHone",
        "roles",
        "type",
      ]);
    }
    if (scope === "create") {
      delete doc._id;
    }
    const collection = await this.getCollection();
    ["username"].forEach((key) => {
      if (doc[key] === undefined) {
        throw new Error(`${key.toUpperCase()} field is required`);
      }
    });
    if (doc.email) {
      const emailDuplicatedQuery: any = {
        email: doc.email,
        type: { $ne: "tmp" },
      };
      if (doc._id) {
        emailDuplicatedQuery["_id"] = {
          $ne: new ObjectId(doc._id),
        };
      }
      if ((await collection.find(emailDuplicatedQuery).count()) > 0) {
        throw new Error("Email is duplicated");
      }
    }
    if (doc.phone) {
      const phoneDuplicatedQuery: any = {
        phone: doc.phone,
        type: { $ne: "tmp" },
      };
      if (doc._id) {
        phoneDuplicatedQuery["_id"] = {
          $ne: new ObjectId(doc._id),
        };
      }
      const duplicated = await collection.find(phoneDuplicatedQuery).count();
      if (duplicated > 0) {
        throw new Error("Phone number is duplicated");
      }
    }
    if (doc.passwordRaw) {
      if (doc.passwordRaw < 6) {
        throw new Error("Password is too short");
      }
      doc.password = await bcrypt.hash(doc.passwordRaw, saltRounds);
      delete doc.passwordRaw;
    }
    if (!doc.roles) {
      doc.roles = [];
    }
    return doc;
  }
}
