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
const { ROUTE_PREFIX } = process.env; // SERVER.ROUTE_PREFIX;

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

  app.get(ROUTE_PREFIX + "/geocodeLocations", (req, res) => {
    utils.getGeocodeLocationList(req, res);
  });

  app.get(ROUTE_PREFIX + "/places", (req, res) => {
    utils.getPlaces(req, res);
  });

  app.get(ROUTE_PREFIX + "/users", (req, res) => {});

  app.use(apimw.auth);
  app.use(rbac);

  console.log("path: " + ROUTE_PREFIX);
  app.use(ROUTE_PREFIX + "/accounts", AccountRouter(dbo));
  app.use(ROUTE_PREFIX + "/merchants", MerchantRouter(dbo));
  app.use(ROUTE_PREFIX + "/orders", OrderRouter(dbo));
  app.use(ROUTE_PREFIX + "/roles", RoleRouter(dbo));
  app.use(ROUTE_PREFIX + "/Assignments", AssignmentRouter(dbo));
  app.use(ROUTE_PREFIX + "/categories", CategoryRouter(dbo));
  app.use(ROUTE_PREFIX + "/products", ProductRouter(dbo));
  app.use(ROUTE_PREFIX + "/pages", PageRouter(dbo));
  app.use(ROUTE_PREFIX + "/productStock", StockRouter(dbo));
  app.use(ROUTE_PREFIX + "/statistics", StatisticsRouter(dbo));
  app.use(ROUTE_PREFIX + "/Restaurants", MerchantRouter(dbo)); // deprecated
  app.use(ROUTE_PREFIX + "/Areas", AreaRouter(dbo));
  app.use(ROUTE_PREFIX + "/Tools", ToolRouter(dbo));
  app.use(ROUTE_PREFIX + "/Contacts", ContactRouter(dbo));
  app.use(ROUTE_PREFIX + "/Ranges", RangeRouter(dbo));
  app.use(ROUTE_PREFIX + "/Malls", MallRouter(dbo));
  app.use(ROUTE_PREFIX + "/Locations", LocationRouter(dbo));
  app.use(ROUTE_PREFIX + "/Pickups", PickupRouter(dbo));
  app.use(ROUTE_PREFIX + "/Drivers", DriverRouter(dbo));
  app.use(ROUTE_PREFIX + "/Distances", DistanceRouter(dbo));
  app.use(ROUTE_PREFIX + "/Regions", RegionRouter(dbo));
  app.use(ROUTE_PREFIX + "/MerchantPayments", MerchantPaymentRouter(dbo));
  app.use(ROUTE_PREFIX + "/MerchantBalances", MerchantBalanceRouter(dbo));
  app.use(ROUTE_PREFIX + "/MerchantSchedules", MerchantScheduleRouter(dbo));
  app.use(ROUTE_PREFIX + "/MallSchedules", MallScheduleRouter(dbo));

  app.use(ROUTE_PREFIX + "/ClientPayments", ClientPaymentRouter(dbo));
  app.use(ROUTE_PREFIX + "/DriverPayments", DriverPaymentRouter(dbo));
  app.use(ROUTE_PREFIX + "/DriverBalances", DriverBalanceRouter(dbo));
  app.use(ROUTE_PREFIX + "/Transactions", TransactionRouter(dbo));
  app.use(ROUTE_PREFIX + "/OrderSequences", OrderSequenceRouter(dbo));
  app.use(ROUTE_PREFIX + "/DriverHours", DriverHourRouter(dbo));
  app.use(ROUTE_PREFIX + "/DriverShifts", DriverShiftRouter(dbo));
  app.use(ROUTE_PREFIX + "/DriverSchedules", DriverScheduleRouter(dbo));
  app.use(ROUTE_PREFIX + "/Logs", LogRouter(dbo));
  app.use(ROUTE_PREFIX + "/EventLogs", EventLogRouter(dbo));
  app.use(ROUTE_PREFIX + "/Messages", MessageRouter(dbo));

  app.use(ROUTE_PREFIX + "/CellApplications", CellApplicationRouter(dbo));

  app.use(express.static(path.join(__dirname, "/../uploads")));
  app.set("port", process.env.PORT || SERVER.PORT);

  const server = app.listen(app.get("port"), () => {
    console.log("API is running on :%d/n", app.get("port"));
  });
});

const loadRolePermission = async () => {
  const roleModel = new Role(dbo);
  const role = await roleModel.findOne();
  cache.set("ROLE_PERMISSION", role);
};
