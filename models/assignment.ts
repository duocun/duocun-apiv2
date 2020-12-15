
import { DB } from "../db";
import { Pickup } from "./pickup";
import { PickupByOrder } from './pickup-by-order';
import { Log } from "./log";
import { EventLog } from "./event-log";

import { UNASSIGNED_DRIVER_ID, UNASSIGNED_DRIVER_NAME } from "./driver";
import { IPickup, IPickupMap, PickupStatus } from "./pickup";
import { IPickupByOrder, IPickupByOrderMap } from './pickup-by-order';
import { Order, IOrder, IOrderItem, OrderStatus } from "../models/order";
import { Account } from "./account";

export const AssignmentStatus = {
  ASSIGNED: 'A',
  UNASSIGNED: 'U'
}
export interface IAssignment {
  driverId: string;
  driverName: string;
  clientName: string;
  orderId: string;
  lat: number;
  lng: number;
  type: string;
  status: string; // OrderStatus
}


export class Assignment {
  private pickupModel: Pickup;
  private pickupByOrderModel: PickupByOrder;
  private orderModel: Order;
  private accountModel: Account;

  eventLogModel: EventLog;

  constructor(dbo: DB) {
    this.pickupModel = new Pickup(dbo);
    this.pickupByOrderModel = new PickupByOrder(dbo);
    this.orderModel = new Order(dbo);
    this.accountModel = new Account(dbo);
    this.eventLogModel = new EventLog(dbo);
  }

  async list(query: any): Promise<IAssignment[]> {
    const assignments: IAssignment[] = [];
    const orders = await this.orderModel.find({
      ...query,
      status: {
        $nin: [OrderStatus.BAD, OrderStatus.DELETED, OrderStatus.TEMP],
      }
    });
    orders.forEach(order => {
      const orderId = order._id.toString();
      const lat = order.location.lat;
      const lng = order.location.lng;
      const type = order.type;
      const status = order.status;
      // order.driverId && order.driverId !== UNASSIGNED_DRIVER_ID ? AssignmentStatus.ASSIGNED : AssignmentStatus.UNASSIGNED;
      const driverId = order.driverId ? order.driverId : UNASSIGNED_DRIVER_ID;
      const driverName = order.driverName ? order.driverName : UNASSIGNED_DRIVER_NAME;
      const clientName = order.clientName;
      const assignment: IAssignment = { orderId, lat, lng, type, status, driverId, driverName, clientName };

      assignments.push(assignment);
    });

    return assignments;
  }


  async updateOrders(assignments: IAssignment[]) {
    const orderIds: string[] = [];
    const orderMap: any = {};
    const updates: any[] = [];
    assignments.forEach((a: IAssignment) => {
      orderIds.push(a.orderId);
      orderMap[a.orderId] = a;
    });

    const orders = await this.orderModel.find({ _id: { $in: orderIds } });
    orders.forEach((order: IOrder) => {
      const _id: any = order._id;
      const orderId: string = _id.toString();
      const driverId = orderMap[orderId].driverId; // UNASSIGNED_DRIVER_ID ?
      const driverName = orderMap[orderId].driverName;
      if (driverId) {
        if (driverId !== UNASSIGNED_DRIVER_ID) { // update
          updates.push({
            query: { _id: orderId },
            data: { driverId, driverName }
          });
        } else {
          // unassign fix me
          // const cloned = {...order};
          // delete cloned._id;
          // delete cloned.driverId;
          // delete cloned.driverName;
          // updates.push({
          //   query: { _id: orderId },
          //   data: cloned
          // });
        }
      } else {
        // unassign fix me

        // updates.push({
        //   query: { _id: orderId },
        //   data: {
        //     driverId: UNASSIGNED_DRIVER_ID,
        //     driverName: UNASSIGNED_DRIVER_NAME
        //   }
        // });
      }
    });
    await this.orderModel.bulkUpdate(updates);
    return;
  }

  /** 
   *  input 
   *    assignments: array, eg. [{ orderId, lat, lng, type, status, driverId, driverName, clientName }]
   *    orderIdMap: 
   *  return
   *    [{ orderId, lat, lng, type, status, driverId, driverName, clientName }]
   */
  // async updateAssignments(deliverDate: string,  assignments: IAssignment[]) {

  //   await this.updateOrders(assignments);

  //   const newPickupMap = await this.getPickupMapFromAssignments(assignments);

  //   // update all the pickups for today
  //   const pickupUpdates = [];
  //   const toDelIds = [];
  //   const pickupMap: any = {};
  //   const delivered = `${deliverDate}T15:00:00.000Z`;
  //   const pickups = await this.pickupModel.find({delivered});

  //   for(let i=0; i<pickups.length; i++){
  //     const r = pickups[i];
  //     const driverId = r.driverId.toString();
  //     const productId = r.productId.toString();

  //     const id = `${driverId}-${productId}`;
  //     pickupMap[id] = true;

  //     const existingPickup = newPickupMap[id];
  //     if(existingPickup){
  //       if(existingPickup.quantity !== r.quantity){
  //         pickupUpdates.push({
  //           query: { _id: r._id },
  //           data: { quantity: r.quantity }
  //         });
  //       }else{
  //         // skip update
  //       }
  //     }else{ // to be removed 
  //       toDelIds.push(r._id);
  //     }
  //   }

  //   if(pickupUpdates && pickupUpdates.length > 0){
  //     await this.pickupModel.bulkUpdate(pickupUpdates);
  //   }

  //   if(toDelIds && toDelIds.length > 0){
  //     await this.pickupModel.deleteMany({_id: {$in: toDelIds}});
  //   }

  //   const toAdd: any[] = [];
  //   Object.keys(newPickupMap).forEach(key => {
  //     const r = newPickupMap[key];
  //     if(r){
  //       // pass processed
  //     }else{ // new
  //       const r = newPickupMap[key];
  //       toAdd.push({ ...r });
  //     }
  //   });
  //   if(toAdd.length >0 ){
  //     await this.pickupModel.insertMany(toAdd);
  //   }

  //   // is it possible remove order / change date after assigned? --- out of stock
  //   return;
  // }

  getProductMapFromOrderList(orders: IOrder[]) {
    const productMap: any = {};
    orders.forEach((r: IOrder) => {
      r.items.forEach((it: IOrderItem) => {
        const productId = it.productId.toString();
        productMap[productId] = { productId, productName: it.productName };
      });
    });
    return productMap;
  }

  getPaymentMapFromOrderList(orders: IOrder[]) {
    const paymentMap: any = {};
    orders.forEach((r: IOrder) => {
      const paymentId = r.paymentId?.toString() ?? '';
      if (paymentMap[paymentId]) {
        paymentMap[paymentId] = paymentMap[paymentId].concat({ merchantId: r.merchantId, merchantName: r.merchantName, clientName: r.clientName, products: r.items, code: r.code });
      } else {
        paymentMap[paymentId] = [{ merchantId: r.merchantId, merchantName: r.merchantName, clientName: r.clientName, products: r.items, code: r.code }];
      }
    });
    return paymentMap;
  }

  async getDriverMap(orders: IOrder[]) {
    const drivers = await this.accountModel.getActiveDrivers();
    const driverMap: any = {};

    driverMap[UNASSIGNED_DRIVER_ID] = { driverId: UNASSIGNED_DRIVER_ID, driverName: UNASSIGNED_DRIVER_NAME };

    orders.forEach((r: IOrder) => {
      const driverId = (r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID) ? r.driverId.toString() : UNASSIGNED_DRIVER_ID;
      const driverName = (r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID) ? r.driverName : UNASSIGNED_DRIVER_NAME;
      driverMap[driverId] = { driverId, driverName };
    });

    drivers.forEach((r: any) => {
      const driverId = r._id.toString();
      const driverName = r.username;
      driverMap[driverId] = { driverId, driverName };
    });

    return driverMap;
  }

  /** 
   *  input 
   *    assignments: IAssignment[]
   *
   *  return
   *    IPickupMap
   */
  async initPickupMap(delivered: string, assignments: IAssignment[]): Promise<IPickupMap> {
    const orderIds = assignments.map((a: IAssignment) => a.orderId);
    const r = await this.orderModel.joinFindV2({ _id: { $in: orderIds } });
    const orders = r.data;
    const pickupMap: IPickupMap = {};
    const productMap = this.getProductMapFromOrderList(orders);
    const driverMap = await this.getDriverMap(orders);

    Object.keys(driverMap).forEach((driverId: string) => {
      Object.keys(productMap).forEach((productId: string) => {
        const key = `${driverId}-${productId}`;
        const productName = productMap[productId].productName;
        pickupMap[key] = { ...driverMap[driverId], quantity: 0, productId, productName, delivered, status: PickupStatus.UNPICK_UP };
      })
    });

    // update quantity
    orders.forEach((r: IOrder) => {
      const driverId = r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID ? r.driverId.toString() : UNASSIGNED_DRIVER_ID;
      r.items.forEach((it: IOrderItem) => {
        const productId = it.productId.toString();
        const key = `${driverId}-${productId}`;
        pickupMap[key].quantity += it.quantity;
      });
    });

    return pickupMap;
  }

  /** 
   *  input 
   *    assignments: IAssignment[]
   *
   *  return
   *    IPickupByOrderMap
   */
  async initPickupByOrderMap(delivered: string, assignments: IAssignment[]): Promise<IPickupByOrderMap> {
    const orderIds = assignments.map((a: IAssignment) => a.orderId);
    const r = await this.orderModel.joinFindV2({ _id: { $in: orderIds } });
    const orders = r.data;
    const pickupByOrderMap: IPickupByOrderMap = {};
    const paymentMap = this.getPaymentMapFromOrderList(orders);
    const driverMap = await this.getDriverMap(orders);

    Object.keys(driverMap).forEach((driverId: string) => {
      Object.keys(paymentMap).forEach((paymentId: string) => {
        const key = `${driverId}-${paymentId}`;
        const clientName = paymentMap[paymentId][0].clientName ?? '';
        const items = paymentMap[paymentId];
        const codes: number[] = [];
        items.forEach((i: any) => {
          codes.push(i.code);
        });
        pickupByOrderMap[key] = { ...driverMap[driverId], clientName, quantity: 0, paymentId, items, codes, delivered, status: PickupStatus.UNPICK_UP };
      });
    });

    // update quantity
    orders.forEach((r: IOrder) => {
      const driverId = r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID ? r.driverId.toString() : UNASSIGNED_DRIVER_ID;
      const paymentId = r.paymentId;
      const key = `${driverId}-${paymentId}`;
      pickupByOrderMap[key].quantity = 1;
    });
    return pickupByOrderMap;
  }

  /** Note: this function must be called after await this.updateOrders(assignments);
   *  input 
   *    assignments: array, eg. [{ orderId, lat, lng, type, status, driverId, driverName, clientName }]
   *    orderIdMap: 
   *  return
   *    [{ orderId, lat, lng, type, status, driverId, driverName, clientName }]
   */
  async updateAssignments(deliverDate: string, assignments: IAssignment[]) {

    const delivered = `${deliverDate}T15:00:00.000Z`;
    const compareMap: IPickupMap = await this.initPickupMap(delivered, assignments);

    const originMap: any = {};
    const pickups = await this.pickupModel.find({ delivered });
    pickups.forEach((r: IPickup) => {
      const driverId = r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID ? r.driverId.toString() : UNASSIGNED_DRIVER_ID;
      const productId = r.productId.toString();
      const key = `${driverId}-${productId}`;
      originMap[key] = r;
    });

    const keys = Object.keys(compareMap);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const curr = compareMap[key];
      const origin = originMap[key];

      if (curr.driverId !== UNASSIGNED_DRIVER_ID) {
        if (origin && origin.status !== PickupStatus.DELETED) {
          if (curr.quantity === 0) {
            await this.pickupModel.updateOne({ _id: origin._id }, { status: PickupStatus.DELETED });
          } else if (curr.quantity !== origin.quantity) {
            const status = (origin.status === PickupStatus.PICKED_UP || origin.status === PickupStatus.PICKED_UP_BUT_CHANGED) ? PickupStatus.PICKED_UP_BUT_CHANGED : origin.status;
            await this.pickupModel.updateOne({ _id: origin._id }, { quantity: curr.quantity, status });
          } else {
            // skip
          }
        } else if (origin && origin.status === PickupStatus.DELETED) {
          if (curr.quantity > 0) {
            await this.pickupModel.updateOne({ _id: origin._id }, { quantity: curr.quantity, status: PickupStatus.UNPICK_UP });
          } else {
            // skip
          }
        } else {
          if (curr.quantity > 0) {
            const p: IPickup = { ...curr }
            await this.pickupModel.insertOne(p);
          } else {
            // skip
          }
        }
      } else {
        // skip
      }
    }

    const compareByOrderMap: IPickupByOrderMap = await this.initPickupByOrderMap(delivered, assignments);
    const originByOrderMap: any = {};
    const pickupsByOrder = await this.pickupByOrderModel.find({ delivered });
    pickupsByOrder.forEach((r: IPickupByOrder) => {
      const driverId = r.driverId && r.driverId !== UNASSIGNED_DRIVER_ID ? r.driverId.toString() : UNASSIGNED_DRIVER_ID;
      const paymentId = r.paymentId.toString();
      const key = `${driverId}-${paymentId}`;
      originByOrderMap[key] = r;
    });
    const byOrderKeys = Object.keys(compareByOrderMap);
    for (let i = 0; i < byOrderKeys.length; i++) {
      const key = byOrderKeys[i];
      const curr = compareByOrderMap[key];
      const origin = originByOrderMap[key];
      if (curr.driverId !== UNASSIGNED_DRIVER_ID) {
        if (origin === undefined || curr.paymentId !== origin.paymentId.toString()) {
          if (curr.quantity > 0) {
            const p: IPickupByOrder = { ...curr }
            await this.pickupByOrderModel.insertOne(p);
          }
        }
      }
    }
    return;
  }


}