import type { Sequelize } from "sequelize";
import { Category } from "./category";
import { Customer } from "./customer";
import { Order } from "./order";
import { OrderItem } from "./order-item";
import { OrderTrackingEvent } from "./order-tracking-event";
import { Product } from "./product";
import { ProductCharacteristic } from "./product-characteristic";
import { PurchaseOrder } from "./purchase-order";
import { PurchaseOrderItem } from "./purchase-order-item";
import { Supplier } from "./supplier";
import { User } from "./user";

const modelsMap = {
  Category,
  Customer,
  Order,
  OrderItem,
  OrderTrackingEvent,
  Product,
  ProductCharacteristic,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  User,
};

export type ModelsMap = typeof modelsMap;

export const initAllModels = (sequelize: Sequelize) => {
  Object.values(modelsMap).forEach((model) => model.initialize(sequelize));
  Object.values(modelsMap).forEach((model) => model.associate(modelsMap));
  return modelsMap;
};
