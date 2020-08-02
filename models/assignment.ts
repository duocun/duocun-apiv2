
import { DB } from "../db";
import { Pickup } from "./pickup";
import { Log, Action, AccountType } from "./log";
import { EventLog } from "./event-log";

import { UNASSIGNED_DRIVER_ID, UNASSIGNED_DRIVER_NAME } from "./driver";
import { IPickup, IPickupMap, PickupStatus } from "./pickup";
import { Order, IOrder, IOrderItem, OrderStatus } from "../models/order";

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
  private orderModel: Order;
  private logModel: Log;
  eventLogModel: EventLog;

  constructor(dbo: DB) {
    this.pickupModel = new Pickup(dbo);
    this.orderModel = new Order(dbo);
    this.logModel = new Log(dbo);
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
  /** 
   *  input 
   *    assignments --- IAssignment[]
   *
   *  return
   *    IPickupMap
   */
   async getPickupMapFromAssignments(assignments: IAssignment[]) : Promise<IPickupMap> {
    const pickupMap: IPickupMap = {};
    const orderIds = assignments.map((a: IAssignment) => a.orderId);
    const r = await this.orderModel.joinFindV2({_id: {$in: orderIds}});
    
    r.data.forEach((r: IOrder) => {
      const driverId = r.driverId ? r.driverId : UNASSIGNED_DRIVER_ID;
      const delivered = r.delivered;
      r.items.forEach((it: IOrderItem) => {
        const productId = it.productId;
        const productName: any = it.productName;
        const id = `${driverId}-${productId}`;
        pickupMap[id] = { driverId, delivered, productId, productName, quantity: 0, status: PickupStatus.UNPICK_UP };
      });
    });

    r.data.forEach((r: IOrder) => {
      const driverId = r.driverId;
      r.items.forEach((it: IOrderItem) => {
        const productId = it.productId;
        const id = `${driverId}-${productId}`;
        pickupMap[id].quantity += it.quantity;
      });
    });

    return pickupMap;
  }

  async updateOrders(assignments: IAssignment[]){
    const orderIds: string[] = [];
    const orderMap: any = {};
    const updates: any[] = [];
    assignments.forEach((a: IAssignment) => {
      orderIds.push(a.orderId);
      orderMap[a.orderId] = a;
    });

    const orders = await this.orderModel.find({_id: {$in: orderIds}});
    orders.forEach((order: any) => {
        const orderId: any = order._id.toString();
        const driverId = orderMap[orderId].driverId; // UNASSIGNED_DRIVER_ID ?
        const driverName = orderMap[orderId].driverName;
        if(order.driverId){
          if(order.driverId.toString() !== driverId){
            updates.push({
              query: { _id: orderId },
              data: { driverId, driverName }
            });
          }
        }else{
          updates.push({
            query: { _id: orderId },
            data: {
              driverId: UNASSIGNED_DRIVER_ID,
              driverName: UNASSIGNED_DRIVER_NAME
            }
          });
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
  async updateAssignments(deliverDate: string,  assignments: IAssignment[]) {

    await this.updateOrders(assignments);
    
    const newPickupMap = await this.getPickupMapFromAssignments(assignments);
    
    // update all the pickups for today
    const pickupUpdates = [];
    const toDelIds = [];
    const pickupMap: any = {};
    const delivered = `${deliverDate}T15:00:00.000Z`;
    const pickups = await this.pickupModel.find({delivered});

    for(let i=0; i<pickups.length; i++){
      const r = pickups[i];
      const driverId = r.driverId;
      const productId = r.productId;
      const id = `${driverId}-${productId}`;
      pickupMap[id] = true;

      const existingPickup = newPickupMap[id];
      if(existingPickup){
        if(existingPickup.quantity !== r.quantity){
          pickupUpdates.push({
            query: { _id: r._id },
            data: { quantity: r.quantity }
          });
        }else{
          // skip update
        }
      }else{ // to be removed 
        toDelIds.push(r._id);
      }
    }

    if(pickupUpdates && pickupUpdates.length > 0){
      await this.pickupModel.bulkUpdate(pickupUpdates);
    }

    if(toDelIds && toDelIds.length > 0){
      await this.pickupModel.deleteMany({_id: {$in: toDelIds}});
    }

    const toAdd: any[] = [];
    Object.keys(newPickupMap).forEach(id => {
      const r = newPickupMap[id];
      if(r){
        // pass processed
      }else{ // new
        const r = newPickupMap[id];
        toAdd.push({ ...r });
      }
    });
    if(toAdd.length >0 ){
      await this.pickupModel.insertMany(toAdd);
    }

    // is it possible remove order / change date after assigned? --- out of stock
    return;
  }


}