
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();
const cfg = process.env;
const DB_NAME: any = process.env.DB_NAME;

export interface IJWT {
  EXPIRY: string;   // eg. '365 days'
  ALGORITHM: string;
  SECRET: string;
}

export interface IApiServer {
  PORT: number; //8000,
  ROUTE_PREFIX: string; // "api"
}

export interface IDatabase {
  // "DATABASE":{
  //   "HOST":"localhost",
  //   "NAME":"duocun",
  //   "PORT": 27017,
  //   "POOL_SIZE":10,
  //   "USERNAME":"x",
  //   "PASSWORD":"x"
  // },
  HOST: string | undefined;
  NAME: string | undefined;
  PORT: number;
  POOL_SIZE: number;
  USERNAME: string | undefined;
  PASSWORD: string | undefined;
}

export interface ISmsProvider {
  SID: string;
  TOKEN: string;
  FROM: string;
}

export interface ISNS {
  APP_ID: string;
  APP_SECRET: string;
  TOKEN: string;
}

export interface ISnappay {
  APP_ID: string;
  MERCHANT_ID: string;
  PRIVATE_KEY: string;
  PUBLIC_KEY: string;
  MD5_KEY: string;
}

export interface IStripe{
  API_KEY: string;
}

export interface IMoneris {
  STORE_ID: string;
  API_TOKEN: string;
  CHECKOUT_ID: string;
  ENVIRONMENT: "qa"|"prod";
}

export interface IAwsS3 {
  ACCESS_ID: string,
  ACCESS_KEY: string;
  BUCKET_NAME: string;
}
export interface IMedia{
  TEMP_PATH: string;
}
export class Config {
  private cfg: any;
  public JWT: IJWT;
  public GEOCODE_KEY: string = '';
  public GOOGLE_PLACE_KEY: string = '';
  public GOOGLE_MAP_KEY: string = '';
  public GOOGLE_DISTANCE_KEY: string = '';
  public MEDIA: IMedia;
  public API_SERVER: IApiServer;
  public APIV2_SERVER: IApiServer;
  public DATABASE: IDatabase;
  public TWILIO: ISmsProvider;
  public WECHAT: ISNS;
  public STRIPE: IStripe;
  public SNAPPAY: ISnappay;
  public MONERIS: IMoneris;
  public AWS_S3: IAwsS3;

  constructor() {
    this.cfg = JSON.parse(fs.readFileSync('../duocun.cfg.json', 'utf-8'));
    this.JWT = this.cfg.JWT;
    this.GEOCODE_KEY = this.cfg.GEOCODE.KEY;
    this.GOOGLE_PLACE_KEY = this.cfg.GOOGLE_PLACE.KEY;
    this.GOOGLE_MAP_KEY = this.cfg.GOOGLE_MAP_KEY;
    this.GOOGLE_DISTANCE_KEY = this.cfg.GOOGLE_DISTANCE.KEY;
    this.MEDIA = this.cfg.MEDIA;
    this.API_SERVER = this.cfg.API_SERVER;
    this.APIV2_SERVER = this.cfg.APIV2_SERVER;

    this.DATABASE = {
      HOST: cfg.DB_HOST,
      NAME: DB_NAME,
      PORT: 27017,
      POOL_SIZE: 10,
      USERNAME: cfg.DB_USERNAME,
      PASSWORD: cfg.DB_PASSWORD
    };
    
    this.TWILIO = this.cfg.TWILIO;
    this.WECHAT = this.cfg.WECHAT;
    this.STRIPE = this.cfg.STRIPE;
    this.SNAPPAY = this.cfg.SNAPPAY;
    this.MONERIS = this.cfg.MONERIS;
    this.AWS_S3 = this.cfg.AWS_S3;
  }

}
  
export default new Config();