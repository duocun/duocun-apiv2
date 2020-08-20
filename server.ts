import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import Server from "socket.io";
import { Config } from "./config";
import { DB } from "./db";
import { Utils } from "./utils";

import { AccountRouter } from "./routers/account-route";
import { CategoryRouter } from "./routers/category-route";
import { ProductRouter } from "./routers/product-route";
import { StockRouter } from "./routers/stock-route";
import { OrderRouter } from "./routers/order-route";
import { AssignmentRouter } from "./routers/assignment-route";
import { DistanceRouter } from "./routers/distance-route";
import { MerchantPaymentRouter } from "./routers/merchant-payment-route";
import { MerchantBalanceRouter } from "./routers/merchant-balance-route";
import { MerchantScheduleRouter } from "./routers/merchant-schedule-route";
import { MallScheduleRouter } from "./routers/mall-schedule-route";

import { ClientPaymentRouter } from "./routers/client-payment-route";
import { DriverPaymentRouter } from "./routers/driver-payment-route";
import { DriverBalanceRouter } from "./routers/driver-balance-route";
import { RegionRouter } from "./routers/region-route";
import { TransactionRouter } from "./routers/transaction-route";
import { OrderSequenceRouter } from "./routers/order-sequence-route";
import { DriverHourRouter } from "./routers/driver-hour-route";
import { MerchantRouter } from "./routers/merchant-route";
import { ContactRouter } from "./routers/contact-route";
import { RangeRouter } from "./routers/range-route";
import { MallRouter } from "./routers/mall-route";
import { LocationRouter } from "./routers/location-route";
import { PickupRouter } from "./routers/pickup-route";
import { DriverRouter } from "./routers/driver-route";
import { DriverShiftRouter } from "./routers/driver-shift-route";
import { DriverScheduleRouter } from "./routers/driver-schedule-route";
import { LogRouter } from "./routers/log-route";
import { EventLogRouter } from "./routers/event-log-route";
import { StatisticsRouter } from "./routers/statistics-route";
import { ToolRouter } from "./routers/tool-route";
import { PageRouter } from "./routers/page-route";
import { MessageRouter } from "./routers/message-route";
import { CellApplicationRouter } from "./routers/cell-application-route";
import { AreaRouter } from "./routers/area-route";
import { RoleRouter } from "./routers/role-route";
import { ApiMiddleWare } from "./api-middleware";
import { schedule } from "node-cron";
import { Order } from "./models/order";

import dotenv from "dotenv";
import log from "./lib/logger";
import { rbac } from "./middlewares/rbac";
import { Role } from "./models/role";
import cache from "./lib/cache";

dotenv.config();

function startCellOrderTask(dbo: any) {
  // s m h d m w
  schedule("0 30 23 27 * *", () => {
    const orderModel = new Order(dbo);
    orderModel.createMobilePlanOrders();
  });
}

const utils = new Utils();
const cfg = new Config();
const SERVER = cfg.SERVER;
const SVC_PATH = process.env.ENV === 'local' ? process.env.SVC_PATH : '';

const app = express();
export const dbo = new DB();
const apimw = new ApiMiddleWare();

let io: any;

function setupSocket(server: any) {
  io = Server(server);

  io.on("connection", function (socket: any) {
    log.info(`server socket connected: socket-id=${socket.id}`);

    // socket.on('authentication', function (token: any) {
    // });
  });
}

dbo.init(cfg.DATABASE).then(async (dbClient) => {
  await loadRolePermission();
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
  app.use(bodyParser.json({ limit: "1mb" }));

  const staticPath = path.resolve("uploads");
  console.log(staticPath + "/n/r");
  app.use(express.static(staticPath));

  app.get("/wx", (req, res) => {
    utils.genWechatToken(req, res);
  });

  app.get(SVC_PATH + "/geocodeLocations", (req, res) => {
    utils.getGeocodeLocationList(req, res);
  });

  app.get(SVC_PATH + "/places", (req, res) => {
    utils.getPlaces(req, res);
  });

  app.get(SVC_PATH + "/users", (req, res) => {});

  app.use(apimw.auth);
  app.use(rbac);

  console.log("path: " + SVC_PATH);
  app.use(SVC_PATH + "/accounts", AccountRouter(dbo));
  app.use(SVC_PATH + "/merchants", MerchantRouter(dbo));
  app.use(SVC_PATH + "/orders", OrderRouter(dbo));
  app.use(SVC_PATH + "/roles", RoleRouter(dbo));
  app.use(SVC_PATH + "/Assignments", AssignmentRouter(dbo));
  app.use(SVC_PATH + "/categories", CategoryRouter(dbo));
  app.use(SVC_PATH + "/products", ProductRouter(dbo));
  app.use(SVC_PATH + "/pages", PageRouter(dbo));
  app.use(SVC_PATH + "/productStock", StockRouter(dbo));
  app.use(SVC_PATH + "/statistics", StatisticsRouter(dbo));
  app.use(SVC_PATH + "/Restaurants", MerchantRouter(dbo)); // deprecated
  app.use(SVC_PATH + "/Areas", AreaRouter(dbo));
  app.use(SVC_PATH + "/Tools", ToolRouter(dbo));
  app.use(SVC_PATH + "/Contacts", ContactRouter(dbo));
  app.use(SVC_PATH + "/Ranges", RangeRouter(dbo));
  app.use(SVC_PATH + "/Malls", MallRouter(dbo));
  app.use(SVC_PATH + "/Locations", LocationRouter(dbo));
  app.use(SVC_PATH + "/Pickups", PickupRouter(dbo));
  app.use(SVC_PATH + "/Drivers", DriverRouter(dbo));
  app.use(SVC_PATH + "/Distances", DistanceRouter(dbo));
  app.use(SVC_PATH + "/Regions", RegionRouter(dbo));
  app.use(SVC_PATH + "/MerchantPayments", MerchantPaymentRouter(dbo));
  app.use(SVC_PATH + "/MerchantBalances", MerchantBalanceRouter(dbo));
  app.use(SVC_PATH + "/MerchantSchedules", MerchantScheduleRouter(dbo));
  app.use(SVC_PATH + "/MallSchedules", MallScheduleRouter(dbo));

  app.use(SVC_PATH + "/ClientPayments", ClientPaymentRouter(dbo));
  app.use(SVC_PATH + "/DriverPayments", DriverPaymentRouter(dbo));
  app.use(SVC_PATH + "/DriverBalances", DriverBalanceRouter(dbo));
  app.use(SVC_PATH + "/Transactions", TransactionRouter(dbo));
  app.use(SVC_PATH + "/OrderSequences", OrderSequenceRouter(dbo));
  app.use(SVC_PATH + "/DriverHours", DriverHourRouter(dbo));
  app.use(SVC_PATH + "/DriverShifts", DriverShiftRouter(dbo));
  app.use(SVC_PATH + "/DriverSchedules", DriverScheduleRouter(dbo));
  app.use(SVC_PATH + "/Logs", LogRouter(dbo));
  app.use(SVC_PATH + "/EventLogs", EventLogRouter(dbo));
  app.use(SVC_PATH + "/Messages", MessageRouter(dbo));

  app.use(SVC_PATH + "/CellApplications", CellApplicationRouter(dbo));

  app.use(express.static(path.join(__dirname, "/../uploads")));
  app.set("port", process.env.PORT || SERVER.PORT);

  const server = app.listen(app.get("port"), () => {
    console.log(SVC_PATH);
    console.log("API is running on :%d/n", app.get("port"));
  });
});

const loadRolePermission = async () => {
  const roleModel = new Role(dbo);
  const role = await roleModel.findOne();
  cache.set("ROLE_PERMISSION", role);
};
