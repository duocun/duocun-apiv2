import { DB } from "../db";
import { Model } from "./model";
import { IOrderItem } from "./order";

export interface IPickupByOrder {
  _id?: string;
  driverId: string;
  driverName: string;
  clientName: string;
  paymentId: string;
  items: {
    merchantId: string;
    merchantName: string;
    clientName: string;
    orderId: string;
    code: string;
    products: IOrderItem[];
  }[];
  codes: string[];
  quantity: number;
  status: string;
  delivered: string;
}

export interface IPickupByOrderMap {
  [key: string]: IPickupByOrder; 
}

export class PickupByOrder extends Model {
  constructor(dbo: DB) {
    super(dbo, 'pickups_by_order');
  }
}